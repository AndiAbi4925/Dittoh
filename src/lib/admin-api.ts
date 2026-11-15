import { NextResponse, type NextRequest } from "next/server";
import { adminErrorResponse, requireAdminSession } from "@/lib/admin-guard";
import { checkRateLimit, extractClientIp, hashClientIp } from "@/lib/rate-limit";

const ADMIN_RATE_LIMIT_PER_MIN = 60;

export type AdminApiContext =
  | {
      ok: true;
      githubId: string;
      username?: string;
      ipHash: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function authorizeAdminApiRequest(
  request: NextRequest
): Promise<AdminApiContext> {
  const authResult = await requireAdminSession();
  if (!authResult.ok) {
    return {
      ok: false,
      response: adminErrorResponse(authResult),
    };
  }

  const clientIp = extractClientIp(request.headers);
  const ipHash = hashClientIp(clientIp);
  const rate = await checkRateLimit(
    `admin:${authResult.githubId}`,
    ADMIN_RATE_LIMIT_PER_MIN
  );

  if (!rate.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin rate limit exceeded. Retry shortly." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rate.retryAfterSec),
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      ),
    };
  }

  return {
    ok: true,
    githubId: authResult.githubId,
    username: authResult.username,
    ipHash,
  };
}

export function adminJsonResponse(
  payload: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function parseBoundedJsonBody(
  request: NextRequest,
  maxBytes = 8192
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader) {
    const parsedLen = Number(lengthHeader);
    if (Number.isFinite(parsedLen) && parsedLen > maxBytes) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Request body exceeds maximum allowed size." },
          { status: 413, headers: { "Cache-Control": "no-store" } }
        ),
      };
    }
  }

  try {
    const rawText = await request.text();
    if (Buffer.byteLength(rawText, "utf8") > maxBytes) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Request body exceeds maximum allowed size." },
          { status: 413, headers: { "Cache-Control": "no-store" } }
        ),
      };
    }
    const parsed: unknown = JSON.parse(rawText);
    return { ok: true, data: parsed };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }
}
