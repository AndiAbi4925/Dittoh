import { type NextRequest } from "next/server";
import {
  AllowlistActionError,
  getAdminAllowlistState,
  removeAdminAllowlistEntry,
  upsertAdminAllowlistEntry,
} from "@/lib/admin-allowlist";
import {
  adminJsonResponse,
  authorizeAdminApiRequest,
  parseBoundedJsonBody,
} from "@/lib/admin-api";
import { getDb } from "@/lib/db";
import {
  allowlistCreateSchema,
  allowlistDeleteSchema,
} from "@/lib/validation/admin";

export async function GET(request: NextRequest) {
  const ctx = await authorizeAdminApiRequest(request);
  if (!ctx.ok) {
    return ctx.response;
  }

  const state = await getAdminAllowlistState();
  return adminJsonResponse(state, 200);
}

export async function POST(request: NextRequest) {
  const ctx = await authorizeAdminApiRequest(request);
  if (!ctx.ok) {
    return ctx.response;
  }

  if (!getDb()) {
    return adminJsonResponse(
      {
        error:
          "Database is not configured; updating AdminAllowlist requires DATABASE_URL.",
      },
      503
    );
  }

  const parsedBody = await parseBoundedJsonBody(request, 2048);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const validated = allowlistCreateSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return adminJsonResponse(
      {
        error: "Invalid allowlist entry payload.",
        issues: validated.error.issues.map((issue) => issue.message),
      },
      400
    );
  }

  const entry = await upsertAdminAllowlistEntry(validated.data, {
    githubId: ctx.githubId,
    ipHash: ctx.ipHash,
  });
  const state = await getAdminAllowlistState();

  return adminJsonResponse({ entry, state }, 200);
}

export async function DELETE(request: NextRequest) {
  const ctx = await authorizeAdminApiRequest(request);
  if (!ctx.ok) {
    return ctx.response;
  }

  if (!getDb()) {
    return adminJsonResponse(
      {
        error:
          "Database is not configured; removing AdminAllowlist entries requires DATABASE_URL.",
      },
      503
    );
  }

  const parsedBody = await parseBoundedJsonBody(request, 1024);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const validated = allowlistDeleteSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return adminJsonResponse(
      {
        error: "Invalid allowlist removal payload.",
        issues: validated.error.issues.map((issue) => issue.message),
      },
      400
    );
  }

  try {
    const removed = await removeAdminAllowlistEntry(validated.data.githubId, {
      githubId: ctx.githubId,
      ipHash: ctx.ipHash,
    });

    if (!removed) {
      return adminJsonResponse(
        { error: "Allowlist entry not found for that GitHub ID." },
        404
      );
    }

    const state = await getAdminAllowlistState();
    return adminJsonResponse(
      { deletedGithubId: validated.data.githubId, state },
      200
    );
  } catch (error) {
    if (error instanceof AllowlistActionError) {
      return adminJsonResponse({ error: error.message }, error.status);
    }
    throw error;
  }
}
