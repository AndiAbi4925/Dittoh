"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type {
  AdminAllowlistRole,
  AdminAllowlistState,
  AdminAppConfig,
  AdminAuditLogPage,
  AdminHealthPayload,
  AdminTelemetryStats,
} from "@/lib/admin-types";
import { SUPPORTED_RAW_EXTENSIONS } from "@/lib/constants";

interface AdminDashboardClientProps {
  actorGithubId: string;
  actorUsername?: string;
  initialConfig: AdminAppConfig;
  initialStats: AdminTelemetryStats;
  initialAuditLogs: AdminAuditLogPage;
  initialHealth: AdminHealthPayload;
  initialAllowlist?: AdminAllowlistState;
  signOutAction: () => Promise<void>;
}

export function AdminDashboardClient({
  actorGithubId,
  actorUsername,
  initialConfig,
  initialStats,
  initialAuditLogs,
  initialHealth,
  initialAllowlist,
  signOutAction,
}: AdminDashboardClientProps) {
  const [config, setConfig] = useState<AdminAppConfig>(initialConfig);
  const [stats, setStats] = useState<AdminTelemetryStats>(initialStats);
  const [health, setHealth] = useState<AdminHealthPayload>(initialHealth);
  const [auditPage, setAuditPage] = useState<AdminAuditLogPage>(initialAuditLogs);
  const [allowlistState, setAllowlistState] = useState<AdminAllowlistState>(
    initialAllowlist ?? {
      databaseConfigured: initialConfig.databaseConfigured,
      envAdminIds: [],
      entries: [],
    }
  );

  const [days, setDays] = useState<number>(initialStats.windowDays);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingAllowlist, setSavingAllowlist] = useState(false);
  const [removingGithubId, setRemovingGithubId] = useState<string | null>(null);
  const [pendingRemoveEntry, setPendingRemoveEntry] = useState<{
    githubId: string;
    username: string;
  } | null>(null);
  const [newAllowlistGithubId, setNewAllowlistGithubId] = useState("");
  const [newAllowlistUsername, setNewAllowlistUsername] = useState("");
  const [newAllowlistRole, setNewAllowlistRole] =
    useState<AdminAllowlistRole>("ADMIN");
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [draftMaxImage, setDraftMaxImage] = useState(initialConfig.maxImageSizeMb);
  const [draftMaxVideo, setDraftMaxVideo] = useState(initialConfig.maxVideoSizeMb);
  const [draftMaxVideoSec, setDraftMaxVideoSec] = useState(
    initialConfig.maxVideoDurationSec
  );
  const [draftRateLimit, setDraftRateLimit] = useState(
    initialConfig.rateLimitPerMin
  );
  const [draftRawFormats, setDraftRawFormats] = useState<string[]>(
    initialConfig.enabledRawFormats
  );
  const [draftEnableVideo, setDraftEnableVideo] = useState<boolean>(
    initialConfig.enableVideoConverter
  );

  const refreshStatsAndLogs = async (nextDays = days, nextOffset = auditPage.offset) => {
    setRefreshingStats(true);
    setErrorMessage(null);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch(`/api/admin/stats?days=${nextDays}`, { cache: "no-store" }),
        fetch(`/api/admin/audit-logs?limit=${auditPage.limit}&offset=${nextOffset}`, {
          cache: "no-store",
        }),
      ]);

      if (statsRes.ok) {
        const statsJson = (await statsRes.json()) as {
          stats: AdminTelemetryStats;
          health: AdminHealthPayload;
        };
        setStats(statsJson.stats);
        setHealth(statsJson.health);
      }

      if (logsRes.ok) {
        const logsJson = (await logsRes.json()) as AdminAuditLogPage;
        setAuditPage(logsJson);
      }
    } catch {
      setErrorMessage("Could not refresh admin telemetry endpoints.");
    } finally {
      setRefreshingStats(false);
    }
  };

  const handleToggleRawFormat = (ext: string) => {
    setDraftRawFormats((prev) =>
      prev.includes(ext) ? prev.filter((item) => item !== ext) : [...prev, ext]
    );
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxImageSizeMb: draftMaxImage,
          maxVideoSizeMb: draftMaxVideo,
          maxVideoDurationSec: draftMaxVideoSec,
          enabledRawFormats: draftRawFormats,
          enableVideoConverter: draftEnableVideo,
          rateLimitPerMin: draftRateLimit,
        }),
      });

      const data = (await res.json()) as AdminAppConfig & { error?: string };
      if (!res.ok) {
        setErrorMessage(data.error ?? "Failed to update AppConfig.");
        return;
      }

      setConfig(data);
      setStatusMessage("AppConfig saved and recorded to AuditLog.");
      await refreshStatsAndLogs(days, 0);
    } catch {
      setErrorMessage("Network failure updating configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddAllowlistEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAllowlist(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/allowlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubId: newAllowlistGithubId.trim(),
          username: newAllowlistUsername.trim().replace(/^@/, ""),
          role: newAllowlistRole,
        }),
      });

      const data = (await res.json()) as {
        state?: AdminAllowlistState;
        error?: string;
        issues?: string[];
      };

      if (!res.ok || !data.state) {
        setErrorMessage(
          data.issues?.[0] ?? data.error ?? "Failed to update AdminAllowlist."
        );
        return;
      }

      setAllowlistState(data.state);
      setNewAllowlistGithubId("");
      setNewAllowlistUsername("");
      setNewAllowlistRole("ADMIN");
      setStatusMessage("Allowlist entry saved and recorded to AuditLog.");
      await refreshStatsAndLogs(days, 0);
    } catch {
      setErrorMessage("Network failure updating allowlist.");
    } finally {
      setSavingAllowlist(false);
    }
  };

  const handleRemoveAllowlistEntry = async (githubId: string) => {
    setRemovingGithubId(githubId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/allowlist", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ githubId }),
      });

      const data = (await res.json()) as {
        state?: AdminAllowlistState;
        error?: string;
      };

      if (!res.ok || !data.state) {
        setErrorMessage(data.error ?? "Failed to remove allowlist entry.");
        return;
      }

      setAllowlistState(data.state);
      setStatusMessage(`Removed GitHub ID ${githubId} from AdminAllowlist.`);
      await refreshStatsAndLogs(days, 0);
    } catch {
      setErrorMessage("Network failure removing allowlist entry.");
    } finally {
      setRemovingGithubId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 border border-[#000000] bg-[#ffffff] p-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-mono text-xs tracking-widest text-[#d71921] uppercase">
            PROTECTED CONTROL PLANE / ALLOWLIST VERIFIED
          </p>
          <h1 className="mt-1 font-display text-3xl text-[#000000]">
            DITTOH ADMIN CONSOLE
          </h1>
          <p className="mt-1 font-mono text-xs text-[#525252]">
            SIGNED IN AS {actorUsername ? `@${actorUsername}` : "GITHUB ADMIN"} (ID{" "}
            {actorGithubId})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/convert"
            className="dittoh-btn border border-[#b1b3b3] bg-[#ffffff] px-4 py-2 text-xs text-[#000000] hover:border-[#000000]"
          >
            OPEN CONVERTER
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="dittoh-btn border border-[#000000] bg-[#000000] px-4 py-2 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
            >
              SIGN OUT
            </button>
          </form>
        </div>
      </div>

      <section aria-label="System health and database state" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-[#b1b3b3] bg-[#ffffff] p-4">
          <p className="font-mono text-[11px] uppercase text-[#525252]">
            SYSTEM HEALTH
          </p>
          <p className="mt-2 flex items-center gap-2 font-mono text-xl text-[#000000] uppercase">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-[2px] ${
                health.status === "ok" ? "bg-[#000000]" : "bg-[#d71921]"
              }`}
              aria-hidden="true"
            />
            <span>{health.status}</span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#525252]">
            VERSION {health.version}
          </p>
        </div>

        <div className="border border-[#b1b3b3] bg-[#ffffff] p-4">
          <p className="font-mono text-[11px] uppercase text-[#525252]">
            NEON POSTGRESQL
          </p>
          <p className="mt-2 font-mono text-xl text-[#000000] uppercase">
            {health.database}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#525252]">
            {typeof health.latencyMs === "number"
              ? `QUERY LATENCY ${health.latencyMs} MS`
              : "NEON POSTGRESQL UNCONFIGURED"}
          </p>
        </div>

        <div className="border border-[#b1b3b3] bg-[#ffffff] p-4">
          <p className="font-mono text-[11px] uppercase text-[#525252]">
            ACTIVE CONFIG SOURCE
          </p>
          <p className="mt-2 font-mono text-xl text-[#000000] uppercase">
            {config.source}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#525252]">
            {config.updatedAt
              ? `UPDATED ${config.updatedAt.slice(0, 19).replace("T", " ")}`
              : "USING DEFAULT CONSTANTS"}
          </p>
        </div>

        <div className="border border-[#b1b3b3] bg-[#ffffff] p-4">
          <p className="font-mono text-[11px] uppercase text-[#525252]">
            ENABLED RAW DECODERS
          </p>
          <p className="mt-2 font-mono text-xl text-[#000000] uppercase">
            {config.enabledRawFormats.length > 0
              ? config.enabledRawFormats.join(" / ")
              : "NONE"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[#525252]">
            MAX IMAGE: {config.maxImageSizeMb} MB
          </p>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="border border-[#d71921] bg-[#ffffff] px-4 py-3 font-mono text-xs text-[#d71921]"
        >
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="border border-[#000000] bg-[#f4f4f4] px-4 py-3 font-mono text-xs text-[#000000]"
        >
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="border border-[#b1b3b3] bg-[#ffffff] p-6 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b1b3b3] pb-4">
            <div>
              <p className="font-mono text-[11px] tracking-widest text-[#d71921] uppercase">
                RECORDED TELEMETRY AGGREGATES
              </p>
              <h2 className="mt-1 font-display text-xl text-[#000000]">
                USAGE & PERFORMANCE METRICS
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {([7, 30, 90] as const).map((windowOption) => (
                <button
                  key={windowOption}
                  type="button"
                  onClick={() => {
                    setDays(windowOption);
                    void refreshStatsAndLogs(windowOption, auditPage.offset);
                  }}
                  className={`dittoh-btn border px-2.5 py-1 text-[11px] ${
                    days === windowOption
                      ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                      : "border-[#b1b3b3] bg-[#ffffff] text-[#000000]"
                  }`}
                >
                  {windowOption}D
                </button>
              ))}
              <button
                type="button"
                disabled={refreshingStats}
                onClick={() => {
                  void refreshStatsAndLogs(days, auditPage.offset);
                }}
                className="dittoh-btn border border-[#b1b3b3] bg-[#f4f4f4] px-2.5 py-1 text-[11px] text-[#000000] hover:border-[#000000]"
              >
                {refreshingStats ? "..." : "REFRESH"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "TOTAL EVENTS", value: stats.totalEvents },
              { label: "CONVERSIONS", value: stats.conversionsCount },
              { label: "EXPORTS", value: stats.exportsCount },
              { label: "BG CUTOUTS", value: stats.bgRemovalsCount },
              { label: "ERRORS", value: stats.errorsCount },
              {
                label: "AVG DURATION",
                value:
                  stats.avgDurationMs !== null
                    ? `${stats.avgDurationMs} ms`
                    : "N/A",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="border border-[#b1b3b3] bg-[#f4f4f4] p-3"
              >
                <p className="font-mono text-[10px] uppercase text-[#525252]">
                  {metric.label}
                </p>
                <p className="mt-1 font-mono text-lg text-[#000000]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="border border-[#b1b3b3] bg-[#f4f4f4] p-3.5">
              <p className="font-mono text-[11px] uppercase text-[#000000]">
                TOP INPUT FORMATS
              </p>
              {stats.byInputFormat.length === 0 ? (
                <p className="mt-2 font-mono text-xs text-[#525252]">
                  No recorded format events in window.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 font-mono text-xs">
                  {stats.byInputFormat.map((row) => (
                    <li
                      key={row.format}
                      className="flex items-center justify-between text-[#000000]"
                    >
                      <span className="uppercase">{row.format}</span>
                      <span>{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-[#b1b3b3] bg-[#f4f4f4] p-3.5">
              <p className="font-mono text-[11px] uppercase text-[#000000]">
                TOP EXPORT FORMATS
              </p>
              {stats.byOutputFormat.length === 0 ? (
                <p className="mt-2 font-mono text-xs text-[#525252]">
                  No recorded export events in window.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 font-mono text-xs">
                  {stats.byOutputFormat.map((row) => (
                    <li
                      key={row.format}
                      className="flex items-center justify-between text-[#000000]"
                    >
                      <span className="uppercase">.{row.format}</span>
                      <span>{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="border border-[#b1b3b3] bg-[#ffffff] p-6 lg:col-span-6">
          <div className="border-b border-[#b1b3b3] pb-4">
            <p className="font-mono text-[11px] tracking-widest text-[#d71921] uppercase">
              RUNTIME LIMITS & FEATURE FLAGS
            </p>
            <h2 className="mt-1 font-display text-xl text-[#000000]">
              APPCONFIG CONTROLS
            </h2>
          </div>

          <form onSubmit={handleSaveConfig} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-1 font-mono text-xs">
                <span className="uppercase text-[#000000]">
                  MAX IMAGE SIZE (MB)
                </span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={draftMaxImage}
                  onChange={(e) => setDraftMaxImage(Number(e.target.value))}
                  className="w-full border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 text-[#000000]"
                />
              </label>

              <label className="block space-y-1 font-mono text-xs">
                <span className="uppercase text-[#000000]">
                  RATE LIMIT (REQ / MIN)
                </span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={draftRateLimit}
                  onChange={(e) => setDraftRateLimit(Number(e.target.value))}
                  className="w-full border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 text-[#000000]"
                />
              </label>

              <label className="block space-y-1 font-mono text-xs">
                <span className="uppercase text-[#000000]">
                  MAX VIDEO SIZE (MB)
                </span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={draftMaxVideo}
                  onChange={(e) => setDraftMaxVideo(Number(e.target.value))}
                  className="w-full border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 text-[#000000]"
                />
              </label>

              <label className="block space-y-1 font-mono text-xs">
                <span className="uppercase text-[#000000]">
                  MAX VIDEO DURATION (S)
                </span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draftMaxVideoSec}
                  onChange={(e) => setDraftMaxVideoSec(Number(e.target.value))}
                  className="w-full border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 text-[#000000]"
                />
              </label>
            </div>

            <div className="space-y-2 border border-[#b1b3b3] bg-[#f4f4f4] p-3.5">
              <span className="block font-mono text-xs uppercase text-[#000000]">
                ENABLED CAMERA RAW FORMATS
              </span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {SUPPORTED_RAW_EXTENSIONS.map((ext) => {
                  const checked = draftRawFormats.includes(ext);
                  return (
                    <label
                      key={ext}
                      className={`flex cursor-pointer items-center justify-center gap-1.5 border px-2 py-1.5 font-mono text-xs uppercase ${
                        checked
                          ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                          : "border-[#b1b3b3] bg-[#ffffff] text-[#000000]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleRawFormat(ext)}
                        className="sr-only"
                      />
                      <span>.{ext}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3 border border-[#b1b3b3] bg-[#f4f4f4] p-3.5 font-mono text-xs uppercase text-[#000000]">
              <span>ENABLE VIDEO &amp; GIF CONVERTER</span>
              <input
                type="checkbox"
                checked={draftEnableVideo}
                onChange={(e) => setDraftEnableVideo(e.target.checked)}
                className="h-4 w-4 accent-[#d71921]"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {!config.databaseConfigured && (
                <span className="font-mono text-[11px] text-[#d71921]">
                  Read-only fallback: configure Neon PostgreSQL persistence to save changes.
                </span>
              )}
              <button
                type="submit"
                disabled={savingConfig || !config.databaseConfigured}
                className="dittoh-btn border border-[#000000] bg-[#000000] px-5 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-40"
              >
                {savingConfig ? "SAVING..." : "SAVE APPCONFIG"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="border border-[#b1b3b3] bg-[#ffffff] p-6">
        <div className="border-b border-[#b1b3b3] pb-4">
          <p className="font-mono text-[11px] tracking-widest text-[#d71921] uppercase">
            ZERO-TRUST ACCESS CONTROL / ADMIN ALLOWLIST
          </p>
          <h2 className="mt-1 font-display text-xl text-[#000000]">
            ALLOWLIST MANAGEMENT
          </h2>
          <p className="mt-1 font-mono text-xs text-[#525252]">
            Manage numeric GitHub user IDs permitted to access /admin and /api/admin endpoints.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div className="border border-[#b1b3b3] bg-[#f4f4f4] p-4">
              <p className="font-mono text-[11px] font-medium uppercase text-[#000000]">
                ENV BOOTSTRAP IDS (GITHUB_ADMIN_IDS)
              </p>
              {allowlistState.envAdminIds.length === 0 ? (
                <p className="mt-2 font-mono text-xs text-[#525252]">
                  No static IDs configured in GITHUB_ADMIN_IDS.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {allowlistState.envAdminIds.map((id) => (
                    <span
                      key={id}
                      className="rounded-[2px] border border-[#000000] bg-[#ffffff] px-2.5 py-1 font-mono text-xs text-[#000000]"
                    >
                      {id}
                      {id === actorGithubId ? " (YOU)" : ""}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 font-mono text-[11px] text-[#525252]">
                Env allowlist entries are read-only and cannot be revoked from the UI.
              </p>
            </div>

            <form
              onSubmit={handleAddAllowlistEntry}
              className="space-y-3 border border-[#b1b3b3] bg-[#ffffff] p-4"
            >
              <p className="font-mono text-[11px] font-medium uppercase text-[#000000]">
                ADD OR UPDATE DATABASE ADMIN
              </p>

              <label className="block font-mono text-xs text-[#000000]">
                <span className="text-[11px] uppercase text-[#525252]">
                  GITHUB NUMERIC ID
                </span>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="^\d{1,24}$"
                  placeholder="e.g. 12345678"
                  value={newAllowlistGithubId}
                  onChange={(e) => setNewAllowlistGithubId(e.target.value)}
                  className="mt-1.5 w-full rounded-[2px] border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 font-mono text-sm text-[#000000]"
                />
              </label>

              <label className="block font-mono text-xs text-[#000000]">
                <span className="text-[11px] uppercase text-[#525252]">
                  GITHUB USERNAME
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. octocat"
                  value={newAllowlistUsername}
                  onChange={(e) => setNewAllowlistUsername(e.target.value)}
                  className="mt-1.5 w-full rounded-[2px] border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 font-mono text-sm text-[#000000]"
                />
              </label>

              <label className="block font-mono text-xs text-[#000000]">
                <span className="text-[11px] uppercase text-[#525252]">
                  ACCESS ROLE
                </span>
                <select
                  value={newAllowlistRole}
                  onChange={(e) =>
                    setNewAllowlistRole(
                      e.target.value === "VIEWER" ? "VIEWER" : "ADMIN"
                    )
                  }
                  className="mt-1.5 w-full rounded-[2px] border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 font-mono text-sm text-[#000000]"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={savingAllowlist || !allowlistState.databaseConfigured}
                className="dittoh-btn w-full border border-[#000000] bg-[#000000] px-4 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-40"
              >
                {savingAllowlist ? "SAVING..." : "SAVE ALLOWLIST ENTRY"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7">
            {allowlistState.entries.length === 0 ? (
              <p className="border border-dashed border-[#b1b3b3] bg-[#f4f4f4] p-4 font-mono text-xs text-[#525252]">
                {allowlistState.databaseConfigured
                  ? "No database-managed AdminAllowlist entries recorded yet."
                  : "Database unconfigured. Configure Neon PostgreSQL to manage allowlist rows."}
              </p>
            ) : (
              <div className="overflow-x-auto border border-[#b1b3b3]">
                <table className="w-full border-collapse text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#b1b3b3] bg-[#f4f4f4] text-[11px] uppercase text-[#525252]">
                      <th className="px-3 py-2">GITHUB ID</th>
                      <th className="px-3 py-2">USERNAME</th>
                      <th className="px-3 py-2">ROLE</th>
                      <th className="px-3 py-2">ADDED</th>
                      <th className="px-3 py-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowlistState.entries.map((entry) => {
                      const isSelf = entry.githubId === actorGithubId;
                      const busy = removingGithubId === entry.githubId;
                      return (
                        <tr key={entry.id} className="border-b border-[#e5e5e5]">
                          <td className="px-3 py-2.5 text-[#000000]">
                            {entry.githubId}
                          </td>
                          <td className="px-3 py-2.5 text-[#000000]">
                            @{entry.username}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-[2px] border border-[#b1b3b3] bg-[#f4f4f4] px-2 py-0.5 text-[11px] text-[#000000]">
                              {entry.role}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-[#525252]">
                            {entry.createdAt.slice(0, 10)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {isSelf ? (
                              <span className="font-mono text-[11px] text-[#525252]">
                                CURRENT SESSION
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={
                                  busy || !allowlistState.databaseConfigured
                                }
                                onClick={() =>
                                  setPendingRemoveEntry({
                                    githubId: entry.githubId,
                                    username: entry.username,
                                  })
                                }
                                className="dittoh-btn border border-[#d71921] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#d71921] hover:bg-[#d71921] hover:text-[#ffffff] disabled:opacity-40"
                              >
                                {busy ? "REMOVING..." : "REMOVE"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border border-[#b1b3b3] bg-[#ffffff] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b1b3b3] pb-4">
          <div>
            <p className="font-mono text-[11px] tracking-widest text-[#d71921] uppercase">
              SECURITY TRAIL / ADMIN MUTATIONS
            </p>
            <h2 className="mt-1 font-display text-xl text-[#000000]">
              AUDIT LOG VIEWER ({auditPage.total} TOTAL)
            </h2>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              disabled={auditPage.offset <= 0 || refreshingStats}
              onClick={() => {
                const prevOffset = Math.max(0, auditPage.offset - auditPage.limit);
                void refreshStatsAndLogs(days, prevOffset);
              }}
              className="dittoh-btn border border-[#b1b3b3] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] disabled:opacity-40"
            >
              PREV
            </button>
            <button
              type="button"
              disabled={
                auditPage.offset + auditPage.limit >= auditPage.total ||
                refreshingStats
              }
              onClick={() => {
                const nextOffset = auditPage.offset + auditPage.limit;
                void refreshStatsAndLogs(days, nextOffset);
              }}
              className="dittoh-btn border border-[#b1b3b3] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] disabled:opacity-40"
            >
              NEXT
            </button>
          </div>
        </div>

        {auditPage.logs.length === 0 ? (
          <p className="mt-4 border border-dashed border-[#b1b3b3] bg-[#f4f4f4] p-4 font-mono text-xs text-[#525252]">
            {auditPage.databaseConfigured
              ? "No admin audit log entries recorded yet."
              : "Database unconfigured. Configure Neon PostgreSQL to store audit logs."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#b1b3b3] bg-[#f4f4f4] text-[11px] uppercase text-[#525252]">
                  <th className="px-3 py-2">TIMESTAMP</th>
                  <th className="px-3 py-2">ACTOR ID</th>
                  <th className="px-3 py-2">ACTION</th>
                  <th className="px-3 py-2">TARGET</th>
                  <th className="px-3 py-2">IP HASH</th>
                  <th className="px-3 py-2">METADATA</th>
                </tr>
              </thead>
              <tbody>
                {auditPage.logs.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#e5e5e5]">
                    <td className="px-3 py-2 whitespace-nowrap text-[#525252]">
                      {entry.createdAt.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 text-[#000000]">{entry.actorId}</td>
                    <td className="px-3 py-2 font-medium text-[#d71921]">
                      {entry.action}
                    </td>
                    <td className="px-3 py-2 text-[#525252]">
                      {entry.target ?? "..."}
                    </td>
                    <td className="px-3 py-2 text-[#525252]">
                      {entry.ipHash ?? "..."}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-[#525252]">
                      {JSON.stringify(entry.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingRemoveEntry !== null}
        title="Remove admin access?"
        description={
          pendingRemoveEntry
            ? `Revoke database AdminAllowlist access for @${pendingRemoveEntry.username} (GitHub ID ${pendingRemoveEntry.githubId}).`
            : ""
        }
        confirmLabel="Remove admin"
        onCancel={() => setPendingRemoveEntry(null)}
        onConfirm={() => {
          if (pendingRemoveEntry) {
            const targetId = pendingRemoveEntry.githubId;
            setPendingRemoveEntry(null);
            void handleRemoveAllowlistEntry(targetId);
          }
        }}
      />
    </div>
  );
}
