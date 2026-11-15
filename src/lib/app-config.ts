import { type Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  DEFAULT_ENABLED_RAW_FORMATS,
  DEFAULT_MAX_IMAGE_SIZE_MB,
  DEFAULT_MAX_VIDEO_DURATION_SEC,
  DEFAULT_MAX_VIDEO_SIZE_MB,
  DEFAULT_RATE_LIMIT_PER_MIN,
} from "@/lib/constants";
import { getDb, requireDb } from "@/lib/db";
import type {
  AdminAppConfig,
  PublicAppConfig,
} from "@/lib/admin-types";
import type { AppConfigPatchInput } from "@/lib/validation/admin";

export type { AdminAppConfig, PublicAppConfig } from "@/lib/admin-types";

export const DEFAULT_PUBLIC_APP_CONFIG: PublicAppConfig = {
  maxImageSizeMb: DEFAULT_MAX_IMAGE_SIZE_MB,
  maxVideoSizeMb: DEFAULT_MAX_VIDEO_SIZE_MB,
  maxVideoDurationSec: DEFAULT_MAX_VIDEO_DURATION_SEC,
  enabledRawFormats: [...DEFAULT_ENABLED_RAW_FORMATS],
  enableVideoConverter: false,
  rateLimitPerMin: DEFAULT_RATE_LIMIT_PER_MIN,
  source: "default",
  updatedAt: null,
};

export async function getPublicAppConfig(
  dbOverride?: PrismaClient | null
): Promise<PublicAppConfig> {
  const db = dbOverride === undefined ? getDb() : dbOverride;
  if (!db) {
    return { ...DEFAULT_PUBLIC_APP_CONFIG };
  }

  try {
    const row = await db.appConfig.findUnique({
      where: { id: "default" },
    });

    if (!row) {
      return { ...DEFAULT_PUBLIC_APP_CONFIG };
    }

    return {
      maxImageSizeMb: row.maxImageSizeMb,
      maxVideoSizeMb: row.maxVideoSizeMb,
      maxVideoDurationSec: row.maxVideoDurationSec,
      enabledRawFormats: [...row.enabledRawFormats],
      enableVideoConverter: row.enableVideoConverter,
      rateLimitPerMin: row.rateLimitPerMin,
      source: "database",
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch {
    return { ...DEFAULT_PUBLIC_APP_CONFIG };
  }
}

export async function getAdminAppConfig(
  dbOverride?: PrismaClient | null
): Promise<AdminAppConfig> {
  const db = dbOverride === undefined ? getDb() : dbOverride;
  if (!db) {
    return {
      ...DEFAULT_PUBLIC_APP_CONFIG,
      updatedBy: null,
      databaseConfigured: false,
    };
  }

  try {
    const row = await db.appConfig.findUnique({
      where: { id: "default" },
    });

    if (!row) {
      return {
        ...DEFAULT_PUBLIC_APP_CONFIG,
        updatedBy: null,
        databaseConfigured: true,
      };
    }

    return {
      maxImageSizeMb: row.maxImageSizeMb,
      maxVideoSizeMb: row.maxVideoSizeMb,
      maxVideoDurationSec: row.maxVideoDurationSec,
      enabledRawFormats: [...row.enabledRawFormats],
      enableVideoConverter: row.enableVideoConverter,
      rateLimitPerMin: row.rateLimitPerMin,
      source: "database",
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      databaseConfigured: true,
    };
  } catch {
    return {
      ...DEFAULT_PUBLIC_APP_CONFIG,
      updatedBy: null,
      databaseConfigured: true,
    };
  }
}

export async function updateAppConfig(
  patch: AppConfigPatchInput,
  actor: { githubId: string; ipHash?: string },
  dbOverride?: PrismaClient | null
): Promise<AdminAppConfig> {
  const db = dbOverride ?? requireDb();

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.appConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        maxImageSizeMb:
          patch.maxImageSizeMb ?? DEFAULT_PUBLIC_APP_CONFIG.maxImageSizeMb,
        maxVideoSizeMb:
          patch.maxVideoSizeMb ?? DEFAULT_PUBLIC_APP_CONFIG.maxVideoSizeMb,
        maxVideoDurationSec:
          patch.maxVideoDurationSec ??
          DEFAULT_PUBLIC_APP_CONFIG.maxVideoDurationSec,
        enabledRawFormats:
          patch.enabledRawFormats ??
          DEFAULT_PUBLIC_APP_CONFIG.enabledRawFormats,
        enableVideoConverter:
          patch.enableVideoConverter ??
          DEFAULT_PUBLIC_APP_CONFIG.enableVideoConverter,
        rateLimitPerMin:
          patch.rateLimitPerMin ?? DEFAULT_PUBLIC_APP_CONFIG.rateLimitPerMin,
        updatedBy: actor.githubId,
      },
      update: {
        ...(patch.maxImageSizeMb !== undefined
          ? { maxImageSizeMb: patch.maxImageSizeMb }
          : {}),
        ...(patch.maxVideoSizeMb !== undefined
          ? { maxVideoSizeMb: patch.maxVideoSizeMb }
          : {}),
        ...(patch.maxVideoDurationSec !== undefined
          ? { maxVideoDurationSec: patch.maxVideoDurationSec }
          : {}),
        ...(patch.enabledRawFormats !== undefined
          ? { enabledRawFormats: patch.enabledRawFormats }
          : {}),
        ...(patch.enableVideoConverter !== undefined
          ? { enableVideoConverter: patch.enableVideoConverter }
          : {}),
        ...(patch.rateLimitPerMin !== undefined
          ? { rateLimitPerMin: patch.rateLimitPerMin }
          : {}),
        updatedBy: actor.githubId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.githubId,
        action: "APP_CONFIG_UPDATED",
        target: "app_config:default",
        metadata: patch as unknown as Prisma.InputJsonValue,
        ipHash: actor.ipHash ?? null,
      },
    });

    return row;
  });

  return {
    maxImageSizeMb: updated.maxImageSizeMb,
    maxVideoSizeMb: updated.maxVideoSizeMb,
    maxVideoDurationSec: updated.maxVideoDurationSec,
    enabledRawFormats: [...updated.enabledRawFormats],
    enableVideoConverter: updated.enableVideoConverter,
    rateLimitPerMin: updated.rateLimitPerMin,
    source: "database",
    updatedAt: updated.updatedAt.toISOString(),
    updatedBy: updated.updatedBy,
    databaseConfigured: true,
  };
}
