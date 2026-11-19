import type { Metadata } from "next";
import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { getAdminAllowlistState } from "@/lib/admin-allowlist";
import { verifyAdminSession } from "@/lib/admin-guard";
import { getAdminAppConfig } from "@/lib/app-config";
import { getOptionalServerEnv, parseAdminGithubIds } from "@/lib/env";
import { evaluateHealth } from "@/lib/health";
import {
  getAdminAuditLogs,
  getAdminTelemetryStats,
} from "@/lib/telemetry-stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const env = getOptionalServerEnv();
  const hasAuthSecret = Boolean(env.AUTH_SECRET && env.AUTH_SECRET.length >= 32);
  const hasGithubOAuth = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
  const hasAdminAllowlist = parseAdminGithubIds(env.GITHUB_ADMIN_IDS).size > 0;
  const hasDatabaseUrl = Boolean(env.DATABASE_URL);
  const oauthReady = hasAuthSecret && hasGithubOAuth && hasAdminAllowlist;

  if (!oauthReady) {
    return (
      <div className="dittoh-dot-grid min-h-[70vh] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#000000] bg-[#ffffff] p-8">
          <p className="font-mono text-xs tracking-widest text-[#d71921] uppercase">
            ADMIN ACCESS LOCKED / CONFIGURATION REQUIRED
          </p>
          <h1 className="mt-2 font-display text-3xl text-[#000000]">
            AUTHENTICATION SETUP INCOMPLETE
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#525252]">
            Dittoh protects /admin with server-side Auth.js GitHub OAuth and
            strict GITHUB_ADMIN_IDS allowlist enforcement. Configure the missing
            server environment variables in Vercel or .env.local to activate
            administrative sign-in.
          </p>

          <ul className="mt-6 space-y-2 border border-[#b1b3b3] bg-[#f4f4f4] p-4 font-mono text-xs">
            <li className="flex justify-between">
              <span>AUTH_SECRET (&gt;= 32 CHARS)</span>
              <span className={hasAuthSecret ? "text-[#000000]" : "text-[#d71921]"}>
                {hasAuthSecret ? "CONFIGURED" : "MISSING"}
              </span>
            </li>
            <li className="flex justify-between">
              <span>AUTH_GITHUB_ID & AUTH_GITHUB_SECRET</span>
              <span className={hasGithubOAuth ? "text-[#000000]" : "text-[#d71921]"}>
                {hasGithubOAuth ? "CONFIGURED" : "MISSING"}
              </span>
            </li>
            <li className="flex justify-between">
              <span>GITHUB_ADMIN_IDS (NUMERIC)</span>
              <span className={hasAdminAllowlist ? "text-[#000000]" : "text-[#d71921]"}>
                {hasAdminAllowlist ? "CONFIGURED" : "MISSING"}
              </span>
            </li>
            <li className="flex justify-between">
              <span>DATABASE_URL (NEON POSTGRESQL)</span>
              <span className={hasDatabaseUrl ? "text-[#000000]" : "text-[#525252]"}>
                {hasDatabaseUrl ? "CONFIGURED" : "OPTIONAL FALLBACK"}
              </span>
            </li>
          </ul>

          <div className="mt-6">
            <Link
              href="/"
              className="dittoh-btn border border-[#000000] bg-[#000000] px-4 py-2 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
            >
              BACK TO HOME
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  const verification = await verifyAdminSession(session);

  if (!verification.ok) {
    const isForbidden = verification.status === 403;

    async function handleGithubSignIn() {
      "use server";
      await signIn("github", { redirectTo: "/admin" });
    }

    async function handleSignOutForbidden() {
      "use server";
      await signOut({ redirectTo: "/" });
    }

    return (
      <div className="dittoh-dot-grid min-h-[70vh] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-xl border border-[#000000] bg-[#ffffff] p-8">
          <p className="font-mono text-xs tracking-widest text-[#d71921] uppercase">
            {isForbidden
              ? "HTTP 403 / ACCESS DENIED"
              : "AUTHENTICATION REQUIRED / GITHUB OAUTH"}
          </p>
          <h1 className="mt-2 font-display text-3xl text-[#000000]">
            {isForbidden
              ? "ACCOUNT NOT IN ALLOWLIST"
              : "DITTOH ADMIN SIGN IN"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#525252]">
            {verification.error} Only numeric GitHub user IDs explicitly listed
            in GITHUB_ADMIN_IDS or AdminAllowlist may access system telemetry and
            runtime limits.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isForbidden ? (
              <form action={handleSignOutForbidden}>
                <button
                  type="submit"
                  className="dittoh-btn border border-[#000000] bg-[#000000] px-5 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
                >
                  SIGN OUT
                </button>
              </form>
            ) : (
              <form action={handleGithubSignIn}>
                <button
                  type="submit"
                  className="dittoh-btn border border-[#000000] bg-[#000000] px-5 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
                >
                  SIGN IN WITH GITHUB
                </button>
              </form>
            )}

            <Link
              href="/convert"
              className="dittoh-btn border border-[#b1b3b3] bg-[#ffffff] px-4 py-2.5 text-xs text-[#000000] hover:border-[#000000]"
            >
              Go to Converter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [
    initialConfig,
    initialStats,
    initialAuditLogs,
    healthResult,
    initialAllowlist,
  ] = await Promise.all([
    getAdminAppConfig(),
    getAdminTelemetryStats(30),
    getAdminAuditLogs({ limit: 25, offset: 0 }),
    evaluateHealth(),
    getAdminAllowlistState(),
  ]);

  async function handleAdminSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <AdminDashboardClient
        actorGithubId={verification.githubId}
        actorUsername={verification.username}
        initialConfig={initialConfig}
        initialStats={initialStats}
        initialAuditLogs={initialAuditLogs}
        initialHealth={healthResult.body}
        initialAllowlist={initialAllowlist}
        signOutAction={handleAdminSignOut}
      />
    </div>
  );
}
