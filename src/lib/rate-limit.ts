import { createHash } from "node:crypto";
import { getOptionalServerEnv } from "@/lib/env";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSec: number;
}

interface MemoryBucket {
  timestamps: number[];
  expiresAt: number;
}

const MAX_MEMORY_KEYS = 2048;
const memoryBuckets = new Map<string, MemoryBucket>();

export function resetMemoryRateLimiterForTests(): void {
  memoryBuckets.clear();
}

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && first.length <= 64) {
      return first;
    }
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && realIp.length <= 64) {
    return realIp;
  }
  return "unknown";
}

export function hashClientIp(ip: string, salt?: string): string {
  const secretSalt =
    salt ?? getOptionalServerEnv().AUTH_SECRET ?? "dittoh-default-salt";
  return createHash("sha256")
    .update(`${secretSalt}:${ip}`)
    .digest("hex")
    .slice(0, 24);
}

function pruneExpiredBuckets(nowMs: number): void {
  if (memoryBuckets.size < MAX_MEMORY_KEYS) {
    return;
  }
  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.expiresAt <= nowMs) {
      memoryBuckets.delete(key);
    }
  }
  if (memoryBuckets.size >= MAX_MEMORY_KEYS) {
    const oldestKey = memoryBuckets.keys().next().value;
    if (oldestKey) {
      memoryBuckets.delete(oldestKey);
    }
  }
}

export function checkMemoryRateLimit(
  key: string,
  limitPerWindow: number,
  windowMs = 60_000,
  nowMs = Date.now()
): RateLimitResult {
  const limit = Math.max(1, Math.round(limitPerWindow));
  const cutoff = nowMs - windowMs;
  pruneExpiredBuckets(nowMs);

  const existing = memoryBuckets.get(key);
  const recent = existing
    ? existing.timestamps.filter((ts) => ts > cutoff)
    : [];

  if (recent.length >= limit) {
    const oldestInWindow = recent[0] ?? nowMs;
    const resetAtMs = oldestInWindow + windowMs;
    const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
    memoryBuckets.set(key, { timestamps: recent, expiresAt: resetAtMs });
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAtMs,
      retryAfterSec,
    };
  }

  recent.push(nowMs);
  const oldestInWindow = recent[0] ?? nowMs;
  const resetAtMs = oldestInWindow + windowMs;
  memoryBuckets.set(key, { timestamps: recent, expiresAt: resetAtMs });

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - recent.length),
    resetAtMs,
    retryAfterSec: 0,
  };
}

async function checkUpstashRateLimit(
  key: string,
  limitPerWindow: number,
  windowMs: number,
  nowMs: number,
  url: string,
  token: string
): Promise<RateLimitResult | null> {
  const limit = Math.max(1, Math.round(limitPerWindow));
  const windowBucket = Math.floor(nowMs / windowMs);
  const resetAtMs = (windowBucket + 1) * windowMs;
  const redisKey = `rl:${key}:${windowBucket}`;
  const expireSec = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, expireSec, "NX"],
      ]),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data[0]?.result ?? 0);
    const allowed = count <= limit;
    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - count),
      resetAtMs,
      retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
    };
  } catch {
    return null;
  }
}

export async function checkRateLimit(
  key: string,
  limitPerWindow: number,
  windowMs = 60_000,
  nowMs = Date.now()
): Promise<RateLimitResult> {
  const env = getOptionalServerEnv();
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const upstash = await checkUpstashRateLimit(
      key,
      limitPerWindow,
      windowMs,
      nowMs,
      env.UPSTASH_REDIS_REST_URL,
      env.UPSTASH_REDIS_REST_TOKEN
    );
    if (upstash) {
      return upstash;
    }
  }

  return checkMemoryRateLimit(key, limitPerWindow, windowMs, nowMs);
}
