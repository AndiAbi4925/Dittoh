import { NextResponse, type NextRequest } from "next/server";
import { applyCorsHeaders, evaluateApiCors } from "@/lib/cors";
import { buildSecurityHeaders } from "@/lib/security-headers";

function applySecurityHeadersToResponse(response: NextResponse): NextResponse {
  for (const header of buildSecurityHeaders()) {
    response.headers.set(header.key, header.value);
  }
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const cors = evaluateApiCors({
      method: request.method,
      originHeader: request.headers.get("origin"),
      requestUrl: request.url,
      secFetchSite: request.headers.get("sec-fetch-site"),
    });

    if (!cors.allowed) {
      const forbidden = NextResponse.json(
        { error: "Cross-origin request blocked by CORS policy." },
        { status: 403 }
      );
      return applySecurityHeadersToResponse(forbidden);
    }

    if (cors.isPreflight) {
      const preflight = new NextResponse(null, { status: 204 });
      applyCorsHeaders(preflight.headers, cors.allowOrigin);
      return applySecurityHeadersToResponse(preflight);
    }

    const response = NextResponse.next();
    applyCorsHeaders(response.headers, cors.allowOrigin);
    if (
      pathname.startsWith("/api/admin/") ||
      pathname.startsWith("/api/auth/")
    ) {
      response.headers.set("Cache-Control", "no-store");
    }
    return applySecurityHeadersToResponse(response);
  }

  const response = NextResponse.next();
  if (pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return applySecurityHeadersToResponse(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

