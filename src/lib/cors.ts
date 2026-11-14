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

function normalizeHostOrigin(host: string | undefined): string | null {
  if (!host) {
    return null;
  }
  const trimmed = host.trim();
  if (!trimmed) {
    return null;
  }
  const withScheme =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  return normalizeOrigin(withScheme);
}

export function getAllowedOrigins(
  requestUrl: string,
  configuredAppUrl?: string,
  vercelHosts: {
    vercelUrl?: string;
    vercelProductionUrl?: string;
  } = {
    vercelUrl: process.env.VERCEL_URL,
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  }
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

  const previewOrigin = normalizeHostOrigin(vercelHosts.vercelUrl);
  if (previewOrigin) {
    origins.add(previewOrigin);
  }

  const prodOrigin = normalizeHostOrigin(vercelHosts.vercelProductionUrl);
  if (prodOrigin) {
    origins.add(prodOrigin);
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
    vercelUrl?: string;
    vercelProductionUrl?: string;
  }
): CorsDecision {
  const method = params.method.toUpperCase();
  const isPreflight = method === "OPTIONS";
  const requestOrigin = normalizeOrigin(params.originHeader);

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
    params.configuredAppUrl,
    {
      vercelUrl: params.vercelUrl ?? process.env.VERCEL_URL,
      vercelProductionUrl:
        params.vercelProductionUrl ?? process.env.VERCEL_PROJECT_PRODUCTION_URL,
    }
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
