import { NextResponse, type NextRequest } from "next/server";
import { parseBoundedJsonBody } from "@/lib/admin-api";
import { getPublicAppConfig } from "@/lib/app-config";
import { getPublicEnv } from "@/lib/env";
import { checkRateLimit, extractClientIp, hashClientIp } from "@/lib/rate-limit";
import { recordTelemetryEvent } from "@/lib/telemetry-stats";
import { telemetryEventSchema } from "@/lib/validation/admin";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const publicEnv = getPublicEnv();
  if (!publicEnv.NEXT_PUBLIC_TELEMETRY_ENABLED) {
    return NextResponse.json(
      { ok: true, recorded: false, reason: "telemetry_disabled" },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  }

  const config = await getPublicAppConfig();
  const ipHash = hashClientIp(extractClientIp(request.headers));
  const rate = await checkRateLimit(`telemetry:${ipHash}`, config.rateLimitPerMin);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for telemetry submissions." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rate.retryAfterSec),
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const parsedBody = await parseBoundedJsonBody(request, 2048);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const validated = telemetryEventSchema.safeParse(parsedBody.data);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid telemetry event payload." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const result = await recordTelemetryEvent(validated.data);
  return NextResponse.json(
    { ok: true, recorded: result.recorded, reason: result.reason },
    {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Limit": String(rate.limit),
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    }
  );
}
