import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isGithubIdAllowlisted } from "@/lib/auth-allowlist";

export interface AdminSessionSuccess {
  ok: true;
  githubId: string;
  username?: string;
}

export interface AdminSessionFailure {
  ok: false;
  status: 401 | 403;
  error: string;
}

export type AdminSessionResult = AdminSessionSuccess | AdminSessionFailure;

export interface AdminSessionInput {
  user?: {
    githubId?: string;
    githubUsername?: string;
  };
}

/**
 * Pure server-side verification helper for admin routes and Server Components.
 * Always checks both authenticated session identity and live allowlist status.
 */
export async function verifyAdminSession(
  session: AdminSessionInput | null | undefined,
  allowlistCheck: (githubId: string) => Promise<boolean> = isGithubIdAllowlisted
): Promise<AdminSessionResult> {
  const githubId = session?.user?.githubId;
  if (!githubId) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required.",
    };
  }

  const allowed = await allowlistCheck(githubId);
  if (!allowed) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden: account is not authorized for admin access.",
    };
  }

  return {
    ok: true,
    githubId,
    username: session.user?.githubUsername,
  };
}

export async function requireAdminSession(): Promise<AdminSessionResult> {
  const session = await auth();
  return verifyAdminSession(session);
}

export function adminErrorResponse(failure: AdminSessionFailure): NextResponse {
  return NextResponse.json(
    { error: failure.error },
    {
      status: failure.status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
