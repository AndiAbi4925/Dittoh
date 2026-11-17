export interface PublicAppConfig {
  maxImageSizeMb: number;
  maxVideoSizeMb: number;
  maxVideoDurationSec: number;
  enabledRawFormats: string[];
  enableVideoConverter: boolean;
  rateLimitPerMin: number;
  source: "default" | "database";
  updatedAt: string | null;
}

export interface AdminAppConfig extends PublicAppConfig {
  updatedBy: string | null;
  databaseConfigured: boolean;
}

export interface TelemetryFormatCount {
  format: string;
  count: number;
}

export interface TelemetryRecentItem {
  id: string;
  eventType: string;
  inputFormat: string | null;
  outputFormat: string | null;
  durationMs: number | null;
  errorCode: string | null;
  createdAt: string;
}

export interface AdminTelemetryStats {
  databaseConfigured: boolean;
  windowDays: number;
  totalEvents: number;
  conversionsCount: number;
  exportsCount: number;
  bgRemovalsCount: number;
  errorsCount: number;
  avgDurationMs: number | null;
  byInputFormat: TelemetryFormatCount[];
  byOutputFormat: TelemetryFormatCount[];
  recentEvents: TelemetryRecentItem[];
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  action: string;
  target: string | null;
  metadata: unknown;
  ipHash: string | null;
  createdAt: string;
}

export interface AdminAuditLogPage {
  databaseConfigured: boolean;
  total: number;
  limit: number;
  offset: number;
  logs: AuditLogItem[];
}

export interface AdminHealthPayload {
  status: "ok" | "degraded";
  version: string;
  timestamp: string;
  database: "ok" | "unconfigured" | "error";
  latencyMs?: number;
}

export type AdminAllowlistRole = "ADMIN" | "VIEWER";

export interface AdminAllowlistEntry {
  id: string;
  githubId: string;
  username: string;
  role: AdminAllowlistRole;
  createdAt: string;
}

export interface AdminAllowlistState {
  databaseConfigured: boolean;
  envAdminIds: string[];
  entries: AdminAllowlistEntry[];
}
