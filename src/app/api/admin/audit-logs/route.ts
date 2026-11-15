import { type NextRequest } from "next/server";
import { adminJsonResponse, authorizeAdminApiRequest } from "@/lib/admin-api";
import { getAdminAuditLogs } from "@/lib/telemetry-stats";
import { adminAuditQuerySchema } from "@/lib/validation/admin";

export async function GET(request: NextRequest) {
  const ctx = await authorizeAdminApiRequest(request);
  if (!ctx.ok) {
    return ctx.response;
  }

  const parsedQuery = adminAuditQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    offset: request.nextUrl.searchParams.get("offset") ?? undefined,
    action: request.nextUrl.searchParams.get("action") ?? undefined,
  });

  if (!parsedQuery.success) {
    return adminJsonResponse(
      { error: "Invalid audit log query parameters." },
      400
    );
  }

  const page = await getAdminAuditLogs(parsedQuery.data);
  return adminJsonResponse(page, 200);
}
