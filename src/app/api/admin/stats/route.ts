import { type NextRequest } from "next/server";
import { adminJsonResponse, authorizeAdminApiRequest } from "@/lib/admin-api";
import { evaluateHealth } from "@/lib/health";
import { getAdminTelemetryStats } from "@/lib/telemetry-stats";
import { adminStatsQuerySchema } from "@/lib/validation/admin";

export async function GET(request: NextRequest) {
  const ctx = await authorizeAdminApiRequest(request);
  if (!ctx.ok) {
    return ctx.response;
  }

  const parsedQuery = adminStatsQuerySchema.safeParse({
    days: request.nextUrl.searchParams.get("days") ?? undefined,
  });

  if (!parsedQuery.success) {
    return adminJsonResponse(
      { error: "Invalid days query parameter (expected integer 1..90)." },
      400
    );
  }

  const [stats, health] = await Promise.all([
    getAdminTelemetryStats(parsedQuery.data.days),
    evaluateHealth(),
  ]);

  return adminJsonResponse(
    {
      stats,
      health: health.body,
    },
    200
  );
}
