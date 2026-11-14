export interface SecurityHeadersOptions {
  isProduction?: boolean;
}

export interface HeaderEntry {
  key: string;
  value: string;
}

/**
 * Builds strict Content-Security-Policy directives tailored for Next.js App Router,
 * local @fontsource fonts, Canvas/Blob previews, and WebAssembly Web Workers.
 */
export function buildContentSecurityPolicy(
  options: SecurityHeadersOptions = {}
): string {
  const isProduction =
    options.isProduction ?? process.env.NODE_ENV === "production";

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    ...(isProduction ? [] : ["'unsafe-eval'"]),
  ].join(" ");

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self' https://github.com",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com",
    "connect-src 'self' blob: data:",
    "worker-src 'self' blob:",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

/**
 * Returns the baseline HTTP security headers applied across application routes.
 */
export function buildSecurityHeaders(
  options: SecurityHeadersOptions = {}
): HeaderEntry[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options),
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
    {
      key: "X-DNS-Prefetch-Control",
      value: "off",
    },
  ];
}

