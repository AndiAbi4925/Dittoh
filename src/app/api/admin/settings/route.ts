import { type NextRequest } from "next/server";
import {
  adminJsonResponse,
  authorizeAdminApiRequest,
  parseBoundedJsonBody,
} from "@/lib/admin-api";
import { getAdminAppConfig, updateAppConfig } from "@/lib/app-config";
import { getDb } from "@/lib/db";
import { appConfigPatchSchema } from "@/lib/validation/admin";

export async function GET(request: NextRequest) {
  const ctx = await authorizeAdminApiRequest(request);
  if (!ctx.ok) {
    return ctx.response;
  }

  const config = await getAdminAppConfig();
  return adminJsonResponse(config, 200);
}

export async function PATCH(request: NextRequest) {
  const ctx = await authorizeAdminApiRequest(request);
  if (!ctx.ok) {
    return ctx.response;
  }

  if (!getDb()) {
    return adminJsonResponse(
      {
        error:
          "Database is not configured; updating persisted AppConfig requires DATABASE_URL.",
      },
      503
    );
  }

  const parsedBody = await parseBoundedJsonBody(request, 4096);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const validated = appConfigPatchSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return adminJsonResponse(
      {
        error: "Invalid configuration update payload.",
        issues: validated.error.issues.map((issue) => issue.message),
      },
      400
    );
  }

  const updated = await updateAppConfig(validated.data, {
    githubId: ctx.githubId,
    ipHash: ctx.ipHash,
  });

  return adminJsonResponse(updated, 200);
}
