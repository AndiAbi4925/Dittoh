# Dittoh Security Audit and Verification Report

- **Project**: Dittoh (Next.js 16 App Router, TypeScript, Tailwind CSS v4, Prisma 7, Auth.js v5)
- **Branch**: `feat/step-8-raw-and-ui-polish` (extending verified `main` baseline)
- **Audit Scope**: HTTP security headers, COOP/COEP isolation across `/`, `/convert`, `/convert/:path*`, and `/video`, CORS and Fetch Metadata enforcement, Content-Type and body size validation, authentication/allowlist fail-closed behavior, XSS/export sanitization, client bundle secret isolation, dependency audit (`npm audit`), exposed config/sensitive file probes, full Git history secret scan, and self-hosted LibRaw/ONNX/FFmpeg WASM review.
- **Last Verified Date**: 2026-11-16

---

## 1. Executive Summary

Dittoh completes Phase 1 MVP with client-only media/RAW/ONNX/ASCII processing in Web Workers, strict fail-closed authentication and allowlisting on `/admin` and `/api/admin/*`, and zero production dependency vulnerabilities (`npm audit --omit=dev`).

During Step 6 verification, three real hardening issues were uncovered and remediated before signing off:

1. **Client Bundle Env Schema Leakage (`9b0849a`)**: A client component (`SiteHeader.tsx`) imported `SITE_NAV_ITEMS` from `@/lib/site-config.ts`, which also imported the server `@/lib/env.ts` module, pulling server environment field names (`DATABASE_URL`, `AUTH_GITHUB_SECRET`, `GITHUB_ADMIN_IDS`, `UPSTASH_REDIS_REST_TOKEN`, `AUTH_SECRET`, `ADMIN_CONTACT_EMAIL`) into compiled client JS chunks. Fixed by splitting client-safe constants into `src/lib/site-constants.ts` and shared TS interfaces into `src/lib/admin-types.ts` (`bac2c01`).
2. **Unconfigured OAuth 500 Response (`4897d18`)**: `GET /api/auth/session` previously threw `HTTP 500 MissingSecret` when OAuth environment variables were unset. Fixed by gating `src/app/api/auth/[...nextauth]/route.ts` with server readiness checks returning `HTTP 503` with `Cache-Control: no-store`, and enforcing `no-store` across `/api/auth/*` in `src/proxy.ts`.
3. **Permissive Content-Type and Cross-Site Metadata (`43d7990`)**: `POST /api/telemetry` previously accepted `Content-Type: text/plain` payloads (`HTTP 202`), bypassing preflighted JSON requirements. Fixed by requiring `application/json` in `parseBoundedJsonBody` (`src/lib/admin-api.ts`, returning `HTTP 415`) and enforcing `Sec-Fetch-Site: cross-site` blocks on mutating `/api/*` requests in `src/lib/cors.ts` and `src/proxy.ts`.

---

## 2. Remediated Findings and Architectural Controls

### 2.1 Client / Server Boundary Isolation
- Compiled `.next/static/**/*.js` client chunks were scanned against sensitive environment variable identifiers (`DATABASE_URL`, `AUTH_GITHUB_SECRET`, `GITHUB_ADMIN_IDS`, `UPSTASH_REDIS_REST_TOKEN`, `AUTH_SECRET`, `ADMIN_CONTACT_EMAIL`) and dynamic code execution sinks (`eval(`): **0 findings** after fix.
- `tests/security-audit.test.ts` permanently asserts that no `"use client"` file in `src/` imports `@/lib/env`, `@/lib/db`, `@/lib/site-config`, `@/lib/app-config`, `@/lib/telemetry-stats`, or `@/auth`, and scans `src/` for `dangerouslySetInnerHTML`, `eval(`, and `new Function(`.
- Only one `.js.map` file exists under `.next/static/chunks/` (`2z3sh82dl8glu.js.map`), verified to be an empty Turbopack stub (`{ "version": 3, "sources": [], "sections": [] }`) with `productionBrowserSourceMaps` left disabled (`false`).

### 2.2 Security Headers and Cross-Origin Isolation (`next.config.ts` & `src/proxy.ts`)
- `poweredByHeader: false` and `reactStrictMode: true` configured in `next.config.ts`.
- Global security headers attached to `/(.*)` and proxy responses:
  - `Content-Security-Policy` (`script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'` allowing self-hosted LibRaw/ONNX/FFmpeg WASM without `'unsafe-eval'`, `worker-src 'self' blob:`, `media-src 'self' blob:` for client-side preview and encoded MP4/GIF playback, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Scoped Cross-Origin Isolation headers (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`) applied to `/`, `/convert`, `/convert/:path*`, `/video`, `/wasm/*`, and `/_next/static/*` so `onnxruntime-web`, LibRaw, and FFmpeg SharedArrayBuffer multithreading operate securely while `/admin` and `/api/auth/*` remain compatible with GitHub OAuth redirects.
- Admin and auth routes return `Cache-Control: no-store`, and `/admin` sets `X-Robots-Tag: noindex, nofollow`.

### 2.3 Authentication, Allowlist Authorization, and Fail-Closed Admin APIs
- `/admin` (`src/app/admin/page.tsx`) and `/api/admin/{settings,stats,audit-logs}` enforce server-side Auth.js session verification combined with numeric GitHub user ID allowlist checks (`GITHUB_ADMIN_IDS` env var plus optional active `AdminAllowlist` DB records).
- Missing or expired session -> `HTTP 401` (`Cache-Control: no-store`).
- Authenticated non-allowlisted GitHub user -> `HTTP 403` (`Cache-Control: no-store`).
- Missing database/OAuth configuration in production -> `/api/auth/*` returns `HTTP 503` `no-store`, `/api/health` returns `HTTP 503` degraded JSON without leaking connection strings, and `/admin` renders boolean readiness flags without printing secrets.
- Every admin configuration mutation runs inside a Prisma transaction creating an `AuditLog` record containing the actor GitHub ID, action name, change metadata, and salted SHA-256 IP hash (never storing raw client IP addresses).

### 2.4 CORS, Fetch Metadata, Content-Type, Rate Limiting, and Input Validation
- `src/lib/cors.ts` and `src/proxy.ts` block disallowed `Origin` values and `Sec-Fetch-Site: cross-site` mutating requests (`HTTP 403`) on `/api/*`, while permitting standard top-level `GET` navigations for GitHub OAuth callbacks.
- `parseBoundedJsonBody` (`src/lib/admin-api.ts`) requires `application/json` `Content-Type` (`HTTP 415`) and enforces strict byte limits (`HTTP 413`).
- `POST /api/telemetry` and `/api/admin/*` apply sliding-window rate limiting (`src/lib/rate-limit.ts`) returning `HTTP 429` with `Retry-After` and `X-RateLimit-*` headers.
- All API payloads and query parameters are validated using strict `.strict()` Zod schemas (`src/lib/validation/admin.ts`).

### 2.5 XSS, Injection, and Third-Party WASM Security
- **Exporters (`src/lib/ascii/exporters.ts`)**:
  - `.MD` computes dynamic backtick fence lengths to block fenced code block breakouts.
  - `.SVG` escapes XML entities (`&`, `<`, `>`, `"`, `'`) in text spans/titles and restricts color attributes to validated `#rrggbb` hex strings, rejecting `onload="..."` and `expression(...)` injection vectors.
  - `.HTML` produces standalone documents with strict embedded CSP (`default-src 'none'; style-src 'unsafe-inline'`), escaped labels/titles, and sanitized hex styles.
  - Download filenames strip path traversal characters and control bytes.
- **Self-Hosted WASM Runtime (`public/wasm/`)**:
  - `@imgly/background-removal` (`AGPL-3.0`) was audited and rejected prior to bundling.
  - Replaced with permissive self-hosted dependencies (`onnxruntime-web@1.21.0` MIT, `U-2-Netp` Apache-2.0 weights, `libraw-wasm@1.6.0` ISC), tracked in `public/wasm/THIRD-PARTY-LICENSES.txt`.
  - Embind dynamic `new Function` factories in `public/wasm/libraw/worker.js` and `libraw.js` were replaced with static closures (`1d3f01c`) so strict CSP without `'unsafe-eval'` succeeds.
  - Phase 2 video processing self-hosts `@ffmpeg/ffmpeg@0.12.15` (MIT), `@ffmpeg/util@0.12.2` (MIT), and `@ffmpeg/core@0.12.10` (`GPL-2.0-or-later`) under `public/wasm/ffmpeg/` (`31 MB` WASM binary), stripped of external `unpkg.com` CDN URLs and verified to contain zero `eval(` / `new Function(` calls. Notice requirements are tracked in `public/wasm/THIRD-PARTY-LICENSES.txt`.

---

## 3. Verification Matrix (Post-Fix Results)

| Check | Command / Target | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` (`tsc --noEmit`) | Passed (0 errors) |
| ESLint | `npm run lint` (`eslint .`) | Passed (0 errors, 0 warnings) |
| Test Suite | `npm test` (`vitest run`) | Passed (18 test files, 70 tests) |
| Turbopack Build | `npm run build` | Passed (all routes compiled) |
| Prod Dependencies | `npm audit --omit=dev` | Passed (`found 0 vulnerabilities`) |
| Full Dependency Tree | `npm audit` | 7 moderate findings in `minimatch` (`7.0.0 - 11.0.0`) solely under dev-only `@typescript-eslint/*` linting dependencies |
| Negative Style Rules | Scan `src/`, `tests/`, docs | Pill header radius scoped strictly to `SiteHeader.tsx`, 0 emojis, 0 em/en dashes |
| Client Bundle Scan | Scan `.next/static/**/*.js` | 0 env var names, 0 `eval(` calls |
| Git Tracked Files | `git ls-files` | 0 `.env*`, keys, certs, or `.db`/`.sqlite` files |
| Git History Scan | `git log -p --all --no-color` | 0 real keys, tokens, or credentials (only 3 placeholder Postgres URL strings in `env.example`, dev template, and `tests/env.test.ts`) |
| Sensitive File Probes | `GET /.env`, `/.env.local`, `/.git/HEAD`, `/prisma/schema.prisma` | All returned `HTTP 404` |
| Auth Fallback Probe | `GET /api/auth/session` (unset OAuth env) | `HTTP 503`, `Cache-Control: no-store` |
| Admin API Fail-Closed | `GET /api/admin/{settings,stats,audit-logs}` | All returned `HTTP 401`, `Cache-Control: no-store` |
| CORS / Content-Type | Evil `Origin` `OPTIONS`/`POST` and `text/plain` `POST /api/telemetry` | `HTTP 403` (CORS) and `HTTP 415` (`no-store`) |

---

## 4. Production Activation Checklist (Vercel & Neon)

The application serves all public conversion features (`/`), legal documentation (`/terms`, `/privacy`), and unauthenticated API guards cleanly without environment secrets. To unlock `/admin` sign-in, runtime `AppConfig` persistence, telemetry charts, and `AuditLog` recording in Vercel Production:

1. Provision a Neon PostgreSQL database and obtain `DATABASE_URL`.
2. Create a GitHub OAuth App with callback URL `https://dittoh.vercel.app/api/auth/callback/github`.
3. Add the following encrypted environment variables in Vercel Project Settings:
   - `DATABASE_URL`
   - `AUTH_SECRET` (32+ byte random string)
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
   - `GITHUB_ADMIN_IDS` (comma-separated numeric GitHub user IDs)
   - Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_SALT`, `CORS_ALLOWED_ORIGINS`
4. Push the Prisma schema to Neon before first admin sign-in: `npx prisma db push`.
