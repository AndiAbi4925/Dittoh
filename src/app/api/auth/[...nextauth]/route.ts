import { NextResponse, type NextRequest } from "next/server";
import { handlers } from "@/auth";
import { getOptionalServerEnv, parseAdminGithubIds } from "@/lib/env";

function isOAuthConfigured(): boolean {
  const env = getOptionalServerEnv();
  return Boolean(
    env.AUTH_SECRET &&
      env.AUTH_SECRET.length >= 32 &&
      env.AUTH_GITHUB_ID &&
      env.AUTH_GITHUB_SECRET &&
      parseAdminGithubIds(env.GITHUB_ADMIN_IDS).size > 0
  );
}

function oauthUnconfiguredResponse(): NextResponse {
  return NextResponse.json(
    { error: "GitHub OAuth authentication is not configured." },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  if (!isOAuthConfigured()) {
    return oauthUnconfiguredResponse();
  }
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!isOAuthConfigured()) {
    return oauthUnconfiguredResponse();
  }
  return handlers.POST(request);
}
