import { z } from "zod";
import { SUPPORTED_RAW_EXTENSIONS } from "@/lib/constants";

const SAFE_SLUG_PATTERN = /^[a-z0-9_-]{1,24}$/i;
const NUMERIC_GITHUB_ID_PATTERN = /^\d{1,24}$/;
const GITHUB_USERNAME_PATTERN = /^[a-zA-Z0-9-]{1,39}$/;

export const telemetryEventSchema = z
  .object({
    eventType: z.enum(["conversion", "export", "bg_removal", "error"]),
    inputFormat: z
      .string()
      .trim()
      .regex(SAFE_SLUG_PATTERN, "Invalid input format identifier")
      .optional(),
    outputFormat: z
      .string()
      .trim()
      .regex(SAFE_SLUG_PATTERN, "Invalid output format identifier")
      .optional(),
    durationMs: z
      .number()
      .int()
      .min(0)
      .max(600_000)
      .optional(),
    errorCode: z
      .string()
      .trim()
      .regex(SAFE_SLUG_PATTERN, "Invalid error code identifier")
      .optional(),
  })
  .strict();

export type TelemetryEventInput = z.infer<typeof telemetryEventSchema>;

export const appConfigPatchSchema = z
  .object({
    maxImageSizeMb: z.number().int().min(1).max(200).optional(),
    maxVideoSizeMb: z.number().int().min(1).max(500).optional(),
    maxVideoDurationSec: z.number().int().min(1).max(120).optional(),
    enabledRawFormats: z
      .array(z.enum(SUPPORTED_RAW_EXTENSIONS))
      .max(SUPPORTED_RAW_EXTENSIONS.length)
      .transform((list) => Array.from(new Set(list)))
      .optional(),
    enableVideoConverter: z.boolean().optional(),
    rateLimitPerMin: z.number().int().min(5).max(300).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one configuration field must be provided.",
  });

export type AppConfigPatchInput = z.infer<typeof appConfigPatchSchema>;

export const adminAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(5000).default(0),
  action: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_]{1,48}$/)
    .optional(),
});

export const adminStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

export const allowlistCreateSchema = z
  .object({
    githubId: z
      .string()
      .trim()
      .regex(NUMERIC_GITHUB_ID_PATTERN, "GitHub ID must be numeric"),
    username: z
      .string()
      .trim()
      .regex(GITHUB_USERNAME_PATTERN, "Invalid GitHub username"),
    role: z.enum(["ADMIN", "VIEWER"]).default("ADMIN"),
  })
  .strict();
