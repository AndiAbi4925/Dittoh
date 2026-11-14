import { getDb } from "@/lib/db";
import { getOptionalServerEnv, parseAdminGithubIds } from "@/lib/env";

const NUMERIC_GITHUB_ID = /^\d+$/;

export interface GithubAccountLike {
  provider?: string;
  providerAccountId?: string;
}

export interface GithubProfileLike {
  id?: string | number | null;
  login?: string | null;
}

/**
 * Extracts a validated numeric GitHub user ID from OAuth profile or account data.
 * Returns null if the provider is not GitHub or the ID is missing or non-numeric.
 */
export function extractGithubId(
  profile?: GithubProfileLike | null,
  account?: GithubAccountLike | null
): string | null {
  if (account && account.provider !== "github") {
    return null;
  }

  const candidate =
    profile?.id !== undefined && profile?.id !== null
      ? String(profile.id).trim()
      : account?.providerAccountId?.trim();

  if (!candidate || !NUMERIC_GITHUB_ID.test(candidate)) {
    return null;
  }

  return candidate;
}

export interface AllowlistCheckDeps {
  envIds?: string;
  checkDb?: (githubId: string) => Promise<boolean>;
}

async function defaultCheckDbAllowlist(githubId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    const entry = await db.adminAllowlist.findUnique({
      where: { githubId },
      select: { id: true },
    });
    return entry !== null;
  } catch {
    return false;
  }
}

/**
 * Fail-closed allowlist verification against GITHUB_ADMIN_IDS env var and
 * the database AdminAllowlist table.
 */
export async function isGithubIdAllowlisted(
  githubId: string | null | undefined,
  deps?: AllowlistCheckDeps
): Promise<boolean> {
  if (!githubId || !NUMERIC_GITHUB_ID.test(githubId)) {
    return false;
  }

  const rawEnvIds =
    deps?.envIds !== undefined
      ? deps.envIds
      : getOptionalServerEnv().GITHUB_ADMIN_IDS;
  const envAllowlist = parseAdminGithubIds(rawEnvIds);
  if (envAllowlist.has(githubId)) {
    return true;
  }

  const checkDb = deps?.checkDb ?? defaultCheckDbAllowlist;
  return checkDb(githubId);
}
