import { z } from "zod";

const GITHUB_ID_PATTERN = /^\d+$/;

/**
 * Parses a comma-separated list of numeric GitHub user IDs into a normalized set.
 * Non-numeric entries are ignored so usernames cannot accidentally grant access.
 */
export function parseAdminGithubIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }

  const ids = new Set<string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (GITHUB_ID_PATTERN.test(trimmed)) {
      ids.add(trimmed);
    }
  }
  return ids;
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("https://dittoh.vercel.app"),
  NEXT_PUBLIC_TELEMETRY_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((val) => val === "true"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv(
  rawEnv: Record<string, string | undefined> = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_TELEMETRY_ENABLED: process.env.NEXT_PUBLIC_TELEMETRY_ENABLED,
  }
): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL || undefined,
    NEXT_PUBLIC_TELEMETRY_ENABLED:
      rawEnv.NEXT_PUBLIC_TELEMETRY_ENABLED || undefined,
  });
}

const postgresUrlSchema = z
  .string()
  .trim()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) =>
      value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL must start with postgres:// or postgresql://"
  );

const requiredFields = {
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: postgresUrlSchema,
  AUTH_SECRET: z
    .string()
    .trim()
    .min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_GITHUB_ID: z.string().trim().min(1, "AUTH_GITHUB_ID is required"),
  AUTH_GITHUB_SECRET: z
    .string()
    .trim()
    .min(1, "AUTH_GITHUB_SECRET is required"),
  GITHUB_ADMIN_IDS: z
    .string()
    .trim()
    .min(1, "GITHUB_ADMIN_IDS is required")
    .refine(
      (value) => parseAdminGithubIds(value).size > 0,
      "GITHUB_ADMIN_IDS must contain at least one numeric GitHub user ID"
    ),
  ADMIN_CONTACT_EMAIL: z
    .email("ADMIN_CONTACT_EMAIL must be a valid email address")
    .optional(),
  UPSTASH_REDIS_REST_URL: z
    .url("UPSTASH_REDIS_REST_URL must be a valid URL")
    .optional(),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .trim()
    .min(1, "UPSTASH_REDIS_REST_TOKEN cannot be empty")
    .optional(),
};

function enforceUpstashPair(
  env: {
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
  },
  ctx: z.RefinementCtx
): void {
  const hasUrl = Boolean(env.UPSTASH_REDIS_REST_URL);
  const hasToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN);
  if (hasUrl !== hasToken) {
    ctx.addIssue({
      code: "custom",
      path: [hasUrl ? "UPSTASH_REDIS_REST_TOKEN" : "UPSTASH_REDIS_REST_URL"],
      message:
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be provided together",
    });
  }
}

const serverEnvSchema = z.object(requiredFields).superRefine(enforceUpstashPair);

const optionalServerEnvSchema = z
  .object({
    NODE_ENV: requiredFields.NODE_ENV,
    DATABASE_URL: requiredFields.DATABASE_URL.optional(),
    AUTH_SECRET: requiredFields.AUTH_SECRET.optional(),
    AUTH_GITHUB_ID: requiredFields.AUTH_GITHUB_ID.optional(),
    AUTH_GITHUB_SECRET: requiredFields.AUTH_GITHUB_SECRET.optional(),
    GITHUB_ADMIN_IDS: requiredFields.GITHUB_ADMIN_IDS.optional(),
    ADMIN_CONTACT_EMAIL: requiredFields.ADMIN_CONTACT_EMAIL,
    UPSTASH_REDIS_REST_URL: requiredFields.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: requiredFields.UPSTASH_REDIS_REST_TOKEN,
  })
  .superRefine(enforceUpstashPair);

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PartialServerEnv = z.infer<typeof optionalServerEnvSchema>;

function assertServerContext(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "Server environment configuration cannot be accessed in browser code."
    );
  }
}

function normalizeRawEnv(
  rawEnv: Record<string, string | undefined>
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawEnv)) {
    normalized[key] = value === "" ? undefined : value;
  }
  return normalized;
}

function formatZodEnvErrors(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "env";
      return `${key}: ${issue.message}`;
    })
    .join("; ");
  return `Invalid server environment configuration (${details})`;
}

/**
 * Strictly validates all required server environment variables.
 * Never includes variable values in thrown error messages.
 */
export function validateServerEnv(
  rawEnv: Record<string, string | undefined> = process.env
): ServerEnv {
  assertServerContext();
  const parsed = serverEnvSchema.safeParse(normalizeRawEnv(rawEnv));
  if (!parsed.success) {
    throw new Error(formatZodEnvErrors(parsed.error));
  }
  return parsed.data;
}

/**
 * Validates any provided server environment variables without requiring
 * production credentials during local frontend-only development or unit tests.
 */
export function getOptionalServerEnv(
  rawEnv: Record<string, string | undefined> = process.env
): PartialServerEnv {
  assertServerContext();
  const parsed = optionalServerEnvSchema.safeParse(normalizeRawEnv(rawEnv));
  if (!parsed.success) {
    throw new Error(formatZodEnvErrors(parsed.error));
  }
  return parsed.data;
}

const ADMIN_INFRA_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "GITHUB_ADMIN_IDS",
] as const;

export interface BootEnvValidationResult {
  publicEnv: PublicEnv;
  serverEnv: PartialServerEnv;
  missingAdminVars: string[];
}

/**
 * Validates public env and any configured server env vars on server boot.
 * Allows the local browser-only converter routes to start when optional
 * admin/DB variables are not yet provisioned, while failing fast on malformed values.
 */
export function validateBootEnv(
  rawEnv: Record<string, string | undefined> = process.env
): BootEnvValidationResult {
  assertServerContext();
  const publicEnv = getPublicEnv({
    NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_TELEMETRY_ENABLED: rawEnv.NEXT_PUBLIC_TELEMETRY_ENABLED,
  });
  const serverEnv = getOptionalServerEnv(rawEnv);
  const missingAdminVars = ADMIN_INFRA_KEYS.filter((key) => !serverEnv[key]);

  return {
    publicEnv,
    serverEnv,
    missingAdminVars,
  };
}
