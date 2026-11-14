export interface CorsDecision {
  allowed: boolean;
  allowOrigin: string | null;
  isPreflight: boolean;
}

function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function getAllowedOrigins(
  requestUrl: string,
  configuredAppUrl?: string
): Set<string> {
  const origins = new Set<string>();
  const requestOrigin = normalizeOrigin(requestUrl);
  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  const appOrigin = normalizeOrigin(
    configuredAppUrl ?? process.env.NEXT_PUBLIC_APP_URL
  );
  if (appOrigin) {
    origins.add(appOrigin);
  }

  return origins;
}

/**
 * Evaluates strict same-origin CORS policy for API endpoints.
 * Wildcard origins are never permitted.
 */
export function evaluateApiCors(
  params: {
    method: string;
    originHeader: string | null;
    requestUrl: string;
    configuredAppUrl?: string;
  }
): CorsDecision {
  const method = params.method.toUpperCase();
  const isPreflight = method === "OPTIONS";
  const requestOrigin = normalizeOrigin(params.originHeader);

  // Requests without an Origin header (e.g. same-origin navigation or server-to-server)
  // do not carry cross-origin browser credentials, except invalid preflights.
  if (!params.originHeader) {
    return {
      allowed: !isPreflight,
      allowOrigin: null,
      isPreflight,
    };
  }

  if (!requestOrigin) {
    return {
      allowed: false,
      allowOrigin: null,
      isPreflight,
    };
  }

  const allowedOrigins = getAllowedOrigins(
    params.requestUrl,
    params.configuredAppUrl
  );

  if (!allowedOrigins.has(requestOrigin)) {
    return {
      allowed: false,
      allowOrigin: null,
      isPreflight,
    };
  }

  return {
    allowed: true,
    allowOrigin: requestOrigin,
    isPreflight,
  };
}

export function applyCorsHeaders(
  headers: Headers,
  allowOrigin: string | null
): void {
  if (!allowOrigin) {
    return;
  }
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "300");
  headers.set("Vary", "Origin");
}

