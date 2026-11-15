# Dottoh Development Log

## Milestone 1: Foundation, Database, Auth, and Security Baseline

- **Branch**: `feat/step-1-foundation`
- **Status**: Complete (awaiting setup confirmation before Step 2)
- **Date**: 2026-11-15

### Completed Scope

1. **Next.js 16 + TypeScript + Tailwind CSS v4 Baseline**
   - Configured strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`), Tailwind CSS v4 via `@tailwindcss/postcss`, ESLint 9 (`eslint-config-next/core-web-vitals` and `typescript`), and Vitest.
   - Bundled self-hosted SIL OFL fonts (`@fontsource/space-grotesk`, `@fontsource/dotgothic16`, `@fontsource/jetbrains-mono`) behind CSS variables `--font-sans`, `--font-display`, and `--font-mono` with Nothing brand palette tokens in `src/app/globals.css`.
2. **Zod Environment Validation**
   - Implemented `src/lib/env.ts` with `validateServerEnv`, `getOptionalServerEnv`, `getPublicEnv`, and `parseAdminGithubIds` (numeric GitHub IDs only).
   - Wired `src/instrumentation.ts` to validate server env vars on production Node.js startup without printing secret values.
   - Added `env.example` template (no `.env*` files tracked).
3. **Prisma 7 + Neon Serverless PostgreSQL + Health Route**
   - Defined `AdminAllowlist`, `AppConfig`, `TelemetryEvent`, and `AuditLog` models in `prisma/schema.prisma` and configured `prisma.config.ts`.
   - Added `src/lib/db.ts` using `@prisma/adapter-neon` (`PrismaNeon`) and `src/app/api/health/route.ts` backed by `src/lib/health.ts`.
4. **Auth.js v5 GitHub OAuth + Allowlist Guard**
   - Configured `src/auth.ts` (`NextAuth` v5 beta) with JWT session strategy, hardened cookies (`HttpOnly`, `SameSite=Lax`, `Secure` in production), and strict `signIn`/`jwt`/`session` allowlist verification.
   - Implemented `src/lib/auth-allowlist.ts` and `src/lib/admin-guard.ts` (`requireAdminSession`, `verifyAdminSession`) checking `GITHUB_ADMIN_IDS` and `AdminAllowlist`.
5. **Security Headers, CSP, and API CORS Proxy**
   - Added `src/lib/security-headers.ts` (`Content-Security-Policy` with `'wasm-unsafe-eval'`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).
   - Added `src/lib/cors.ts` (strict same-origin CORS, no wildcard `*`) and Next.js 16 `src/proxy.ts` (`Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow` on `/admin`).
   - Configured long-lived immutable cache headers for `/wasm/:path*` in `next.config.ts`.
6. **Unit Tests and Documentation**
   - Added 6 Vitest suites (18 tests) covering constants, env validation, GitHub allowlisting and admin guards, CSP/headers, CORS, and health status evaluation.

### Commit History (Step 1)

- `0d32e47` - `feat(init): scaffold Next.js 16, TypeScript, Tailwind CSS v4, and ESLint baseline`
- `775385c` - `feat(env): add Zod-validated server and public environment configuration`
- `6560221` - `feat(db): configure Prisma ORM schema for Neon PostgreSQL and health endpoint`
- `e64b91b` - `feat(auth): configure Auth.js v5 GitHub OAuth and strict admin allowlist`
- `c83073d` - `feat(security): enforce CSP, HSTS, security headers, and strict API CORS`
- `896c85e` - `test(foundation): add unit tests for env, auth allowlist, CORS, headers, and health`
- `HEAD` - `docs(devlog): initialize DEVLOG.md and README.md for Step 1 milestone`

### Verification Results

- `npm run typecheck` (`tsc --noEmit`): Passed
- `npm run lint` (`eslint .`): Passed
- `npm test` (`vitest run`): 6 test files, 18 tests passed
- `npx next build --webpack`: Passed (static + dynamic routes + `Proxy`)
- `npm audit --omit=dev`: 0 production vulnerabilities
- `npm audit`: 7 moderate vulnerabilities reported strictly in dev-only `@typescript-eslint/typescript-estree -> minimatch` (`10.2.6`)

### Unresolved Issues & Open Questions

1. **Turbopack Sandbox Note**: Inside the macOS seatbelt sandbox, `next build` (Turbopack) fails spawning Node PostCSS workers due to local IPC restrictions; `npx next build --webpack` succeeds in sandbox, and `next build` (Turbopack) should also be verified outside sandbox / on Vercel.
2. **Legal Contact Email**: Confirm the dedicated email address for `/terms` and `/privacy` before Step 2.
3. **Typography Licensing**: Confirm whether commercial webfont files for `NType 82`, `Ndot`, and `LL Lettera Mono` will be provided, or ship with the bundled open-source `@fontsource` fallbacks (`Space Grotesk`, `DotGothic16`, `JetBrains Mono`).
4. **Database Provisioning**: Configure `DATABASE_URL` (Neon) and GitHub OAuth credentials in Vercel / local `.env` before running `npx prisma db push` in Step 5.

### Next Steps

- Confirm Step 1 setup and Step 2 open questions.
- Proceed to Step 2: Nothing-inspired UI shell, Canvas dot-matrix hero, `/terms`, `/privacy`, and custom geometric SVG favicon.

## Milestone 2: Nothing UI Shell, Dot-Matrix Hero, Legal Pages, and Vercel Boot Fix

- **Branch**: `feat/step-2-ui-shell`
- **Status**: Complete (deployed to Vercel production)
- **Date**: 2026-11-15

### Completed Scope

1. **Vercel 500 Boot Fix and Optional Server Env Validation**
   - Diagnosed `HTTP/2 500 Internal Server Error` on `dittoh.vercel.app`: `src/instrumentation.ts` invoked strict `validateServerEnv` at boot when optional Admin/DB/OAuth env vars were not yet configured in Vercel.
   - Added `validateBootEnv` in `src/lib/env.ts` so public routes boot cleanly while logging only missing admin env var names on server startup; updated `src/lib/cors.ts` to recognize `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`.
2. **Brand Icon, Design Tokens, and Motion Provider**
   - Installed `motion` (`14.14.0`) and `gsap` (`3.15.1`) only (zero disallowed animation libraries).
   - Created geometric SVG favicon (`src/app/icon.svg`), `src/components/BrandMark.tsx`, and `src/components/MotionProvider.tsx` (`<MotionConfig reducedMotion="user">`).
   - Kept Nothing palette tokens (`#000000`, `#ffffff`, `#d71921`, `#f4f4f4`, `#b1b3b3`), sharp `0px` to `4px` corners, and font variables in `src/app/globals.css`.
3. **Nothing-Inspired Studio Header, Footer, and Shell**
   - Added `src/lib/site-config.ts`, `src/components/SiteHeader.tsx`, and `src/components/SiteFooter.tsx` wired into `src/app/layout.tsx`.
4. **Interactive Canvas Dot-Matrix Hero and Landing Shell**
   - Implemented `src/components/DotMatrixHero.tsx` with HiDPI HTML5 Canvas rendering, `prefers-reduced-motion` support, and `isProcessing` pause hook.
   - Built `src/components/LandingStudioShell.tsx` with lazy-loaded `gsap` landing choreography and Step 3/4 converter workspace slot on `src/app/page.tsx`.
5. **Legal Pages and Unit/Compliance Tests**
   - Added `src/app/terms/page.tsx` and `src/app/privacy/page.tsx` compliant with Indonesia UU No. 27 Tahun 2022 (UU PDP), distinguishing local browser media processing from optional server/admin telemetry.
   - Added `tests/ui-shell.test.ts` and `tests/legal-pages.test.ts` verifying site config, zero pill buttons, zero em dashes, zero emojis, zero banned animation packages, and UU PDP sections.

### Commit History (Step 2)

- `c7fe28e` - `fix(env): validate optional server env at boot without crashing public routes`
- `0b79391` - `feat(brand): add custom geometric SVG favicon, brand mark, and motion config`
- `b02f8b9` - `feat(layout): implement Nothing-inspired header, footer, and studio shell`
- `930d350` - `feat(hero): build interactive Canvas dot-matrix hero and lazy GSAP landing choreography`
- `0795651` - `feat(legal): add /terms and UU PDP compliant /privacy pages`
- `98f877c` - `test(ui): add unit tests for site config, negative style rules, and legal compliance`
- `HEAD` - `docs(devlog): update DEVLOG.md for Step 2 UI shell milestone`

### Verification Results

- `npm run typecheck` (`tsc --noEmit`): Passed
- `npm run lint` (`eslint .`): Passed
- `npm test` (`vitest run`): 8 test files, 26 tests passed
- `npm run build` (`prisma generate && next build` Turbopack): Passed (`/`, `/privacy`, `/terms`, `/icon.svg`, `/api/health`, `/api/auth/[...nextauth]`, `Proxy`)
- `npm audit --omit=dev`: 0 production vulnerabilities

### Unresolved Issues & Open Questions

1. **Admin Database & OAuth Env Vars on Vercel**: `/admin` and full `ok` DB health require setting `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `GITHUB_ADMIN_IDS` in Vercel before Step 5 verification.
2. **Client Media Pipeline Pending**: Image upload validation, RAW decoding (`libraw-wasm`), and client background removal (`@imgly/background-removal`) will be built in Step 3.

### Next Steps

- Push `feat/step-2-ui-shell` and deploy Step 2 to Vercel production (`dittoh.vercel.app`).
- Proceed to Step 3 (`feat/step-3-media-pipeline`): inspect `@imgly/background-removal` license before bundling, build Web Worker media pipeline, RAW decoder (`libraw-wasm`), and checkerboard background-removal preview controls.

## Milestone 3: Client Web Worker Media Pipeline, RAW Decoder, and Background Removal

- **Branch**: `feat/step-3-media-pipeline`
- **Status**: Complete
- **Date**: 2026-11-15

### Completed Scope

1. **License Audit and Permissive WASM/ONNX Asset Bundling**
   - Inspected `@imgly/background-removal@1.7.0` (`LICENSE.md`) before installing and confirmed it uses **GNU Affero General Public License v3 (AGPL-3.0)** and fetches CDN weights by default. Excluded it from the project.
   - Selected permissive alternatives: `onnxruntime-web@1.21.0` (**MIT**), `BritishWerewolf/U-2-Netp` (`4.4 MB` ONNX weights, **Apache-2.0**), `libraw-wasm@1.6.0` (**ISC**), and `utif@3.1.0` (**MIT**), self-hosted under `public/wasm/` with `THIRD-PARTY-LICENSES.txt` and 1-year immutable cache headers.
   - Configured scoped `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on `/`, `/wasm/*`, and `/_next/static/*` (leaving `/admin` and `/api/auth/*` un-isolated so GitHub OAuth remains unaffected).
   - Replaced Emscripten Embind `new Function` factories in `public/wasm/libraw/worker.js` and `libraw.js` with static closures so `libraw-wasm` runs under strict CSP (`script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`, zero `'unsafe-eval'`).
2. **Media Validation, Hex Compositing, and `MediaProcessor` Interface**
   - Defined clean `MediaProcessor` interface (`src/lib/media/processor.ts`) and error taxonomy (`src/lib/media/types.ts`) for local/remote swappability.
   - Implemented magic-byte signature verification, 50 MB size checks, extension/MIME checks, and feature-flagged RAW gating (`.ARW`, `.DNG` enabled; unverified `.CR2`/`.CR3`/`.NEF`/`.RAF` gated cleanly) in `src/lib/media/validation.ts`.
   - Implemented strict hex color parsing and alpha matte background compositing in `src/lib/media/colors.ts`.
3. **Web Worker Media Decoders and High-Megapixel Safeguards**
   - Built `src/lib/media/pixel-utils.ts` (proportional working-dimension downsampling cap at 2048 px desktop / 1280 px mobile/low-memory and 8/16-bit RAW RGB-to-RGBA conversion).
   - Built `src/lib/media/tiff-decoder.ts` (`utif`), `src/lib/media/raw-decoder.ts` (`LibRawWorkerClient` via `/wasm/libraw/worker.js`), and `src/workers/media-decode.worker.ts` (with main-thread `HTMLImageElement` fallback for native HEIC/AVIF codecs and deterministic `URL.revokeObjectURL` cleanup).
4. **Lazy Web Worker ONNX Background Removal and Studio Preview UI**
   - Implemented `src/lib/media/u2net-preprocess.ts` (aspect-preserved `320x320` ImageNet NCHW preprocessing and un-cropped bilinear matte reconstruction) and `src/workers/bg-removal.worker.ts` (lazy-loaded on demand with cached `InferenceSession`).
   - Built `LocalWorkerProcessor` (`src/lib/media/local-processor.ts`), `MediaDropzone`, `BackgroundRemovalPanel` (Original vs. Cutout toggle, checkerboard transparency view, Transparent / `#000000` / `#ffffff` / custom hex fill), and `ConverterWorkspace` (deterministic stage progress bar, Cancel button, inline `#d71921` error alerts, and `DotMatrixHero` `isProcessing` pause hook) wired into `src/components/LandingStudioShell.tsx`.

### Commit History (Step 3)

- `d04d479` - `chore(media): bundle MIT/Apache-2.0 WASM runtime and configure COOP/COEP`
- `d707d82` - `feat(media): define MediaProcessor interface, file signature validation, and RAW gating`
- `f537a20` - `feat(worker): implement Web Worker decoder for raster, TIFF, and LibRaw RAW`
- `7be3c41` - `feat(bg-removal): implement lazy Web Worker ONNX U-2-Netp background removal`
- `2bc782f` - `feat(studio): build interactive upload dropzone and background removal preview UI`
- `b737211` - `test(media): add unit and license verification tests for validation, preprocessing, and compositing`
- `1d3f01c` - `fix(wasm): replace Embind dynamic codegen with CSP-strict closures in libraw`
- `HEAD` - `docs(devlog): update DEVLOG.md for Step 3 media pipeline milestone`

### Verification Results

- `npm run typecheck` (`tsc --noEmit`): Passed
- `npm run lint` (`eslint .`): Passed
- `npm test` (`vitest run`): 10 test files, 34 tests passed
- `npm run build` (`prisma generate && next build` Turbopack): Passed
- `npm audit --omit=dev`: 0 production vulnerabilities
- Headless Chrome CDP Verification (`next start` under strict CSP): Confirmed `crossOriginIsolated === true`, sample raster decode, real U-2-Netp ONNX background removal, and real `lossy.dng` (`256 x 168`) LibRaw WASM decoding with zero console or CSP errors.

### Unresolved Issues & Open Questions

1. **Non-`.ARW`/`.DNG` RAW Formats**: `.CR2`, `.CR3`, `.NEF`, and `.RAF` remain gated behind `enabledRawFormats` until verified with real hardware sample files. Sony `.ARW` verification via `ILME-FX30` and Adobe `lossy.dng` share the LibRaw-Wasm 1.6.0 engine (`lossy.dng` tested end-to-end in headless Chrome).
2. **HEIC Codec Browser Variance**: Safari/macOS decodes HEIC/HEIF natively; Chromium builds without HEVC/HEIF codecs display a clear actionable error suggesting PNG, JPG, or DNG conversion.

### Next Steps

- Proceed to Step 4 (`feat/step-4-ascii-studio`): implement the Web Worker / Canvas ASCII engine, Basic and Advanced studio controls, `localStorage` custom presets and clearable history, and 5 export generators (`.PNG`, `.TXT`, `.MD`, `.SVG`, `.HTML`).

## Milestone 4: Interactive ASCII Engine, Studio Controls, Presets, and Exporters

- **Branch**: `feat/step-4-ascii-studio`
- **Status**: Complete and verified in Node/Vitest, Turbopack production build, and headless Chrome CDP
- **Date**: 2026-11-15

### Completed Scope

1. **ASCII Grid Engine, Tonal Calibration, and Presets**
   - Defined core studio data models (`AsciiConversionSettings`, `AsciiGridResult`, `AsciiExportConfig`, `SavedAsciiPreset`, `AsciiHistoryEntry`) in `src/lib/ascii/types.ts`.
   - Added 6 preset character ramps (`Standard ASCII`, `Detailed`, `Minimal`, `Blocks`, `Binary`, `Custom`) plus control-byte sanitization (`sanitizeCharacterRamp`) in `src/lib/ascii/presets.ts`.
   - Built proportional cell-averaging, Rec. 709 luminance, Brightness/Contrast/Gamma curve adjustment, alpha cutout transparency space preservation, Monochrome / Original / Custom FG+BG color mapping, and dark-background ramp balancing in `src/lib/ascii/engine.ts`.
2. **Five XSS-Safe Exporters, Zod Storage, and Phase 2 Hook**
   - Implemented deterministic `.TXT` (space-padded), `.MD` (dynamic fence expansion preventing triple-backtick breakout), `.SVG` (XML-escaped text spans, transparent background option, sanitized hex attributes only), `.HTML` (standalone HTML5 with strict `default-src 'none'; style-src 'unsafe-inline'` CSP and escaped metadata), and `.PNG` (HiDPI offscreen Canvas renderer preserving alpha transparency and configurable `targetWidthPx`) in `src/lib/ascii/exporters.ts`.
   - Implemented Zod-validated `localStorage` helpers (`dottoh:custom-presets:v1`, `dottoh:history:v1`, `dottoh:history-enabled:v1`) with strict bounds and corrupt-JSON recovery in `src/lib/ascii/storage.ts`.
   - Added `PHASE2_VIDEO_CONSTRAINTS` and `createDisabledVideoAdapter` in `src/lib/ascii/video-hook.ts` matching Phase 2 limits (`100 MB`, `30s`, `1080p`, `30 FPS`; `720p/12 FPS` MP4 and `15s` GIF targets) without bundling `ffmpeg.wasm` in Phase 1.
3. **Web Worker ASCII Pipeline and Studio UI Components**
   - Built `src/workers/ascii-render.worker.ts` and `AsciiWorkerClient` (`src/lib/ascii/worker-client.ts`) with transferable `cellRgba` buffers and latest-request debouncing.
   - Built `AsciiPreviewCanvas` (`CANVAS` vs. `TEXT`, `FIT` vs. `1:1`, checkerboard transparency preview toggle, live grid/canvas/render timing stats), `AsciiControlsPanel` (Basic controls plus animated `motion/react` Advanced panel respecting `prefers-reduced-motion`), `AsciiPresetsHistoryPanel` (local preset save/apply/delete, history logging toggle, clear history), `AsciiExportPanel`, and `AsciiStudioSection` integrated into `ConverterWorkspace` and `LandingStudioShell`.
4. **Verification Tests**
   - Added `tests/ascii-engine.test.ts` (tonal math, ramp sanitization, monochrome/invert/alpha-space behavior, original/custom color modes) and `tests/ascii-exporters.test.ts` (Markdown breakout guard, SVG/HTML `<script>`/`onerror` injection escaping, path traversal filename stripping, Zod `localStorage` persistence and corruption recovery).

### Commit History (Step 4)

- `6760290` - `feat(ascii): define ASCII studio types, presets, luminance math, and grid generator`
- `4bb448b` - `feat(ascii): add 5 XSS-safe export generators, local storage, and Phase 2 hook`
- `0a3a253` - `feat(worker): build dedicated Web Worker ASCII renderer and Canvas preview`
- `3bf73d8` - `feat(studio): build Basic/Advanced ASCII controls, presets, history, and export panels`
- `8179ab8` - `feat(studio): integrate interactive ASCII studio into ConverterWorkspace`
- `91b6d41` - `test(ascii): add unit tests for ASCII engine, XSS-safe exporters, and Zod storage`
- `7bceb29` - `docs(devlog): update DEVLOG.md for Step 4 interactive ASCII studio`

### Verification Results

- `npm run typecheck` (`tsc --noEmit`): Passed
- `npm run lint` (`eslint .`): Passed
- `npm test` (`vitest run`): 12 test files, 44 tests passed
- `npm run build` (`prisma generate && next build` Turbopack): Passed
- `npm audit --omit=dev`: 0 production vulnerabilities
- Headless Chrome CDP Verification (`next start` under strict CSP + COOP/COEP): Sample Sphere decoded into `100 x 52` ASCII grid in `4 ms` worker turn, switched presets, expanded advanced controls, saved custom preset & history in `localStorage`, and exported `.TXT`, `.MD`, `.SVG`, `.HTML`, and `.PNG` with `0` console or uncaught page errors.

### Unresolved Issues & Open Questions

1. **Admin Database & OAuth Wiring (Addressed in Step 5)**: `/admin` and live `AppConfig`/`TelemetryEvent`/`AuditLog` Prisma persistence remain unimplemented until Step 5 (`feat/step-5-admin-dashboard`); Vercel production environment variables (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `GITHUB_ADMIN_IDS`) remain to be configured once Neon and GitHub OAuth credentials are ready.

### Next Steps

- Proceed to Step 5 (`feat/step-5-admin-dashboard`): implement rate limiter, Zod-validated public/admin APIs (`/api/config`, `/api/telemetry`, `/api/admin/settings`, `/api/admin/stats`, `/api/admin/audit-logs`), `/admin` dashboard with GitHub OAuth allowlisting, telemetry/config wiring, and integration tests.

## Milestone 5: Protected Admin Dashboard, Telemetry, AppConfig, Rate Limiting, and Audit Logging

- **Branch**: `feat/step-5-admin-dashboard`
- **Status**: Complete and verified across unit/integration suites, production build, and live HTTP route smoke checks
- **Date**: 2026-11-15

### Completed Scope

1. **Sliding-Window Rate Limiter, IP Hashing, and Strict Zod Validation**
   - Built `src/lib/rate-limit.ts` with `extractClientIp`, SHA-256 salted `hashClientIp` (never storing raw IP addresses), sliding-window in-memory bucket limiting with bounded eviction, and optional Upstash Redis REST pipeline integration.
   - Defined strict Zod schemas (`telemetryEventSchema`, `appConfigPatchSchema`, `adminAuditQuerySchema`, `adminStatsQuerySchema`, `allowlistCreateSchema`) in `src/lib/validation/admin.ts` rejecting unexpected properties, invalid slugs, and out-of-range limits.
2. **Database Services with Graceful Fallback**
   - Implemented `src/lib/app-config.ts` (`getPublicAppConfig`, `getAdminAppConfig`, transactional `updateAppConfig` writing `AuditLog` entries automatically) with deterministic fallback to default limits when `DATABASE_URL` is unconfigured.
   - Implemented `src/lib/telemetry-stats.ts` (`recordTelemetryEvent`, `writeAuditLog`, `getAdminTelemetryStats`, `getAdminAuditLogs`) computing real recorded usage metrics (`0` / empty when no database records exist, zero fabricated counters).
3. **Public Config, Telemetry, and Fail-Closed Admin APIs**
   - Built `src/lib/admin-api.ts` shared authorization/rate-limiting helper and `parseBoundedJsonBody`.
   - Added `GET /api/config`, `POST /api/telemetry` (rate-limited, `413` body cap, `429` retry headers), `GET/PATCH /api/admin/settings`, `GET /api/admin/stats`, and `GET /api/admin/audit-logs`, all enforced with `requireAdminSession()` (`401`/`403`) and `Cache-Control: no-store`.
4. **Admin Console UI and Studio Live Config Wiring**
   - Built `/admin` (`src/app/admin/page.tsx`) and `AdminDashboardClient` (`src/components/admin/AdminDashboardClient.tsx`) supporting GitHub OAuth sign-in, explicit 403 non-allowlisted barrier, explicit missing-env status guide (booleans only, never secret values), live system health metrics, `7D`/`30D`/`90D` telemetry breakdown, `AppConfig` runtime editor, and paginated `AuditLog` table.
   - Wired `src/app/page.tsx` -> `LandingStudioShell` -> `ConverterWorkspace` to honor dynamic `AppConfig` caps and emit anonymous best-effort events (`conversion`, `bg_removal`, `export`) via `src/lib/ascii/telemetry-client.ts`.
5. **Unit and Integration Test Coverage**
   - Added `tests/rate-limit.test.ts` (sliding-window blocking/recovery, IP hashing, Zod boundary/rejection tests) and `tests/admin-api.test.ts` (DB transaction mock tests, `/api/config` leak check, `/api/telemetry` rate limiting, `/api/admin/*` 401/403/503 enforcement).

### Commit History (Step 5)

- `687d8a7` - `feat(security): add sliding-window rate limiter, IP hashing, and Zod API schemas`
- `c119a75` - `feat(server): add AppConfig, telemetry aggregation, and audit logging services`
- `a7204ce` - `feat(api): add /api/config, rate-limited /api/telemetry, and protected /api/admin routes`
- `c6e3cdd` - `feat(admin): build /admin protected console and wire live AppConfig + telemetry`
- `3e1adbb` - `test(admin): add unit and integration tests for rate limiter, schemas, and admin APIs`
- `fa4e271` - `docs(devlog): update DEVLOG.md for Step 5 admin dashboard and API wiring`

### Verification Results

- `npm run typecheck` (`tsc --noEmit`): Passed
- `npm run lint` (`eslint .`): Passed
- `npm test` (`vitest run`): 14 test files, 54 tests passed
- `npm run build` (`prisma generate && next build` Turbopack): Passed
- `npm audit --omit=dev`: 0 production vulnerabilities
- Production Server Smoke (`next start -p 3198`): `/admin` returned `HTTP 200` (`Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`), `/api/config` returned `HTTP 200`, `/api/telemetry` returned `HTTP 202`, and unauthenticated `/api/admin/*` routes returned `HTTP 401`.

### Unresolved Issues & Open Questions

1. **Production Database & OAuth Secrets**: `/admin` displays an actionable setup checklist until `DATABASE_URL` (Neon PostgreSQL), `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and numeric `GITHUB_ADMIN_IDS` are populated in Vercel Project Settings and `npx prisma db push` / migrations are applied to Neon.

### Next Steps

- Proceed to Step 6 (`feat/step-6-security-audit`): execute the full application security audit (headers, CORS, XSS payloads across SVG/HTML/JSON, client bundle secret scan, exposed config/prisma/env check, `npm audit`, full Git history secret scan), fix any discovered issues, write `SECURITY_AUDIT.md`, push, and verify live Vercel production deployment (`https://dittoh.vercel.app`).

## Milestone 6: Security Hardening, Audit Verification, and Production Readiness

- **Branch**: `feat/step-6-security-audit`
- **Status**: Complete and verified across static scans, unit/regression suites, production build, local HTTP probes, and Vercel production deployment
- **Date**: 2026-11-15

### Completed Scope

1. **Client Bundle Isolation (`src/lib/site-constants.ts`, `src/lib/admin-types.ts`)**
   - Split client-safe navigation constants into `src/lib/site-constants.ts` and shared TS interfaces into `src/lib/admin-types.ts`, breaking client imports of server `env.ts`, `app-config.ts`, `telemetry-stats.ts`, and `site-config.ts`. Verified compiled `.next/static/**/*.js` contains `0` references to server environment variable identifiers.
2. **Auth Fallback Hardening (`src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts`)**
   - Guarded Auth.js `GET`/`POST` handlers when GitHub OAuth environment variables are absent so `/api/auth/*` returns `HTTP 503` with `Cache-Control: no-store` instead of throwing `500`, and enforced `Cache-Control: no-store` on `/api/auth/*` via proxy middleware.
3. **Mutation Content-Type and Fetch Metadata Guards (`src/lib/admin-api.ts`, `src/lib/cors.ts`, `src/proxy.ts`)**
   - Required `application/json` `Content-Type` on JSON body parsing (`HTTP 415 Unsupported Media Type`, `no-store`) and blocked `Sec-Fetch-Site: cross-site` mutating API calls (`HTTP 403`) while keeping top-level `GET` OAuth callback flows functional.
4. **Security Regression Suite and Audit Report (`tests/security-audit.test.ts`, `SECURITY_AUDIT.md`)**
   - Added automated tests covering client-server module isolation, absence of `dangerouslySetInnerHTML`/`eval(`/ `new Function(`, cross-site mutation blocking, `415` `text/plain` rejection, `503` `/api/auth/*` fallback, and adversarial `.SVG`/`.HTML` export escaping.
   - Published full findings and verification matrix in `SECURITY_AUDIT.md`.

### Commit History (Step 6)

- `9b0849a` - `fix(security): isolate server env schema from client bundle via public constants split`
- `4897d18` - `fix(auth): fail gracefully with 503 no-store on /api/auth when OAuth env is unset`
- `43d7990` - `fix(security): enforce JSON Content-Type (415) and Sec-Fetch-Site mutation guards`
- `bac2c01` - `test(security): enforce client-server type separation and add security regression suite`
- Current commit - `docs(security): add SECURITY_AUDIT.md report and Step 6 DEVLOG entry`

### Verification Results

- `npm run typecheck` (`tsc --noEmit`): Passed (0 errors)
- `npm run lint` (`eslint .`): Passed (0 errors, 0 warnings)
- `npm test` (`vitest run`): 15 test files, 60 tests passed
- `npm run build` (`prisma generate && next build` Turbopack): Passed
- `npm audit --omit=dev`: `found 0 vulnerabilities` (7 moderate in dev-only `@typescript-eslint` `minimatch`)
- Security Audit Script (`next start -p 3197`, git history scan, client bundle scan): `0` leaked server env identifiers in `.next/static/*.js`, `0` tracked sensitive files, `0` real secrets in Git history, `404` on `/.env`/`/.env.local`/`/.git/HEAD`/`/prisma/schema.prisma`, `401` on `/api/admin/*`, `403` on evil `Origin`, `415` on `text/plain` POST, `503` `no-store` on `/api/auth/session`.

### Unresolved Issues & Open Questions

1. **Neon Database & GitHub OAuth Provisioning**: User must configure `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and numeric `GITHUB_ADMIN_IDS` in Vercel Project Settings and run `npx prisma db push` to enable live `/admin` sign-in and persistent telemetry storage.
2. **Phase 2 Video / GIF Studio**: Scaffolded behind `enableVideoConverter` flag (`src/lib/ascii/video-hook.ts`); enable after Phase 1 production benchmarks.

### Next Steps

- Merge verified feature branch PRs into `main` on GitHub once user reviews and approves, configure Neon + GitHub OAuth environment variables on Vercel, and push Prisma schema.

## Milestone 7: Phase 2 Video & GIF ASCII Conversion Studio (`ffmpeg.wasm`)

- **Branch**: `feat/step-7-phase2-video`
- **Status**: Complete and verified in Node/Vitest, Turbopack production build, security audit script, and headless Chrome CDP 10s 720p MP4 / GIF benchmarks
- **Date**: 2026-11-15

### Completed Scope

1. **Self-Hosted `ffmpeg.wasm` Assets & Strict CSP Compliance**
   - Installed `@ffmpeg/ffmpeg@^0.12.15`, `@ffmpeg/util@^0.12.2`, and `@ffmpeg/core@^0.12.10`. Audited packages (`MIT` wrapper/util, `GPL-2.0-or-later` core) and documented third-party notices in `public/wasm/THIRD-PARTY-LICENSES.txt`.
   - Vendored `public/wasm/ffmpeg/{ffmpeg-core.js,ffmpeg-core.wasm,worker.js,errors.js,const.js}` pointing `CORE_URL` to `/wasm/ffmpeg/ffmpeg-core.js` (zero external CDN URLs, zero `eval` or `new Function`).
   - Added `media-src 'self' blob:` to `src/lib/security-headers.ts` so encoded MP4 `<video>` playback stays strict under CSP.
2. **Container Validation, GIF Metadata Parser, and Frame Constraints (`src/lib/video/`)**
   - Implemented magic-byte sniffing and strict validation (`src/lib/video/validation.ts`, `src/lib/video/types.ts`) for `.mp4`, `.gif`, `.mov`, and `.webm` up to `100 MB`, `30s`, `1080p` (`1920x1080`), and `30 FPS`, clamping MP4 exports to `720p / 12 FPS` even dimensions and GIF exports to max `15s`.
   - Built pure-TypeScript animated GIF metadata parser (`src/lib/video/gif-metadata.ts`) and procedural animated sample GIF generator (`src/lib/video/sample-clip.ts`).
3. **Temporal ASCII Consistency & High-Speed Atlas Renderer (`src/lib/video/temporal-ascii.ts`, `src/lib/video/video-processor.ts`, `src/lib/video/ffmpeg-client.ts`)**
   - Built stateful temporal luminance smoothing, Schmitt-trigger glyph hysteresis deadband (`0.5 / rampMaxIndex + hysteresis`), locked-first-frame vs per-frame luminance normalization, locked-palette vs per-frame GIF palette encoding, and a pre-baked glyph alpha atlas blitter (`GlyphAlphaAtlas` + `blitAsciiGridToRgbaFrame`) driving self-hosted `ffmpeg.wasm` in `LocalVideoProcessor`.
4. **Video & GIF Studio UI & Runtime AppConfig Wiring (`src/components/studio/VideoAsciiWorkspace.tsx`, `src/components/LandingStudioShell.tsx`, `src/app/page.tsx`)**
   - Added `IMAGE / RAW` and `VIDEO & GIF` studio tabs in `LandingStudioShell`, wired `enableVideoConverter`, `maxVideoSizeMb`, and `maxVideoDurationSec` from `getPublicAppConfig()`, built clip trimming, frame consistency controls, real-time scrubbable ASCII playback preview, H.264 MP4 and animated GIF export + playback preview, and anonymous telemetry reporting.
5. **Unit Tests & Benchmark Activation**
   - Added `tests/video-validation.test.ts` and `tests/temporal-ascii.test.ts`, verifying validation guards, GIF parser round-trip, temporal hysteresis stability, locked-frame luminance preservation, glyph atlas blitting, and FFmpeg argument construction.
   - Enabled `enableVideoConverter = true` defaults (`src/lib/app-config.ts`, `src/lib/ascii/video-hook.ts`, `prisma/schema.prisma`) after verifying Chrome CDP 10s 720p MP4 conversion completes well under the 30s PRD KPI.

### Commit History (Step 7)

- `efba737` - `chore(video): vendor self-hosted ffmpeg.wasm assets, license notices, and media-src CSP`
- `8184a92` - `feat(video): add video/GIF validation, magic-byte sniffing, and constraint types`
- `ec4d2ca` - `feat(video): implement ffmpeg.wasm worker client, glyph atlas renderer, and temporal consistency`
- `3b7b544` - `feat(studio): build Phase 2 Video & GIF ASCII studio UI and wire AppConfig flag`
- `f9d0a4f` - `test(video): add unit tests for video validation, GIF parser, and temporal ASCII`

### Verification Results

- `npm run typecheck` (`tsc --noEmit`): Passed (0 errors)
- `npm run lint` (`eslint .`): Passed (0 errors, 0 warnings)
- `npm test` (`vitest run`): 17 test files, 69 tests passed
- `npm run build` (`prisma generate && next build` Turbopack): Passed
- `npm audit --omit=dev`: `found 0 vulnerabilities`
- Security Audit Script (`next start -p 3197`): `0` leaked server env identifiers in `.next/static/*.js`, `0` tracked sensitive files, `0` console/CSP regressions.
- Headless Chrome CDP Benchmark (`next start -p 3196`, `crossOriginIsolated: true`, `media-src 'self' blob:`):
  - Sample 20-frame GIF (`160x90`): cold `ffmpeg.wasm` boot + frame extract in `15,633 ms`, locked-palette GIF encode (`1280x714`, 24 frames) in `915 ms`, `<img src="blob:...">` verified (`0` console errors, `0` exceptions).
  - Synthetic 10s 720p (`1280x720`, 24 FPS, `325,136 bytes`) H.264 MP4: frame extraction (`120` frames @ `12 FPS`) in `337 ms`, ASCII atlas raster + H.264 encode (`1280x714`, `706 KB`) in `3,646 ms`, end-to-end pipeline wait `4,155 ms` (within `30,000 ms` PRD KPI; `<video>` element natively decoded `1280x714`, `10s`).

### Unresolved Issues & Open Questions

1. **Deployment & Branch Merge**: `feat/step-7-phase2-video` pushes are complete; deploy Phase 2 build to Vercel production and await explicit user approval before fast-forwarding `main`.
2. **Production Database Sync**: When Neon `DATABASE_URL` is configured, run `npx prisma db push` so the updated `@default(true)` on `AppConfig.enableVideoConverter` matches the schema (existing rows remain admin-configurable via `/admin`).

## Milestone 8: Empirical Camera RAW Verification, Step-by-Step UX, and Minimalist 2D Redesign

- **Branch**: `feat/step-8-raw-and-ui-polish`
- **Status**: Complete and verified across `tsc`, `eslint`, Vitest (`18` files / `70` tests), Turbopack production build, `npm audit --omit=dev` (`0` vulnerabilities), and headless Chrome CDP E2E (`1280x800` and `390x844`)
- **Date**: 2026-11-16

### Completed Scope

1. **Empirical Headless Chrome `libraw-wasm` Decoder Audit & Hardening**
   - Downloaded and tested 10 real CC0 camera RAW files in headless Chrome against self-hosted `public/wasm/libraw/worker.js`:
     - `.CR3`: Canon EOS R6 (`3407x2271`, `585 ms`) & Canon EOS R6 Mark III C-RAW (`4319x2879`, `783 ms`): both decoded cleanly.
     - `.CR2`: Canon Rebel (`2314x3474`, `607 ms`): decoded cleanly.
     - `.DNG`: Sigma fp (`1936x1090`, `149 ms`): decoded cleanly.
     - `.ARW`: Sony ILCE-7S (`2784x1872`, `295 ms`): decoded cleanly.
     - `.RAF`: Fujifilm FinePix S5000 (`2012x1521`, `250 ms`) & Fujifilm X-S10 14-bit X-Trans (`6246x4170`, `12,442 ms` full / `1,173 ms` halfSize `3123x2085`): decoded cleanly.
     - `.NEF`: Nikon D1H uncompressed (`2012x1324`, `236 ms`) & Nikon D70s 12-bit compressed (`3039x2014`, `390 ms`): decoded cleanly; newer Nikon Z6 III 8-bit HE compression threw `Cannot read properties of undefined (reading 'data')` in LibRaw WASM.
   - Enabled all 6 verified RAW extensions (`dng`, `cr2`, `cr3`, `nef`, `arw`, `raf`) in `DEFAULT_ENABLED_RAW_FORMATS` (`src/lib/constants.ts`, `prisma/schema.prisma`).
   - Added `halfSize` decoding threshold (`> 14 MB`), automatic half-size OOM retry, and plain-language unsupported-codec guidance (`src/lib/media/raw-decoder.ts`).
2. **Streamlined Format Surface & Dependency Cleanup**
   - Limited photo uploads strictly to `PNG`, `JPG`, `JPEG`, `WebP`, `HEIC`, `HEIF`, and verified `RAW` (`TIFF`/`TIF`, `BMP`, `AVIF` removed from UI/validation; `utif` and `@types/utif` uninstalled cleanly).
   - Limited video & GIF uploads strictly to `MP4` and animated `GIF` (`MOV` and `WebM` removed).
3. **Minimalist 2D UI, Working Pill Navbar, and Step-by-Step Converter Routes**
   - Redesigned `SiteHeader.tsx` into a floating frosted-glass pill navbar (`Home`, `Convert`, `Guide`) with a working interactive `Menu` popover (`Photo to ASCII`, `Video & GIF`, `Format Guide`, `Try a Sample Photo`) and Escape / outside-click / route-change close behavior. Moved `Privacy` and `Terms` strictly to the dark minimal footer (`SiteFooter.tsx`).
   - Rebuilt `/` with `MinimalHomeHero` and removed technical badges/clutter (`EXECUTION: WEB WORKER`, `IMAGE CAP`, `ZERO UPLOAD`, `OPEN CONVERTER`, `LOCAL BROWSER ENGINE`, `STAGE XX`).
   - Replaced the monolithic page converter with dedicated step-by-step App Router pages backed by `ConverterSessionProvider`: `/convert` (Photo), `/convert/background` (Optional Background Cutout), `/convert/style` (Live Preview & Style), `/convert/export` (Copy & Save `.PNG`, `.TXT`, `.MD`, `.SVG`, `.HTML`), plus `/video` (`MP4` & `GIF` tool) and `/guide`.
   - Updated `next.config.ts` so `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` cover `/`, `/convert`, `/convert/:path*`, and `/video` without interfering with `/admin` or `/api/auth/*`.
   - Rewrote all visible UI copy, legal pages (`/privacy`, `/terms`), and admin/docs copy into clear, everyday English free of AI buzzwords and filler.

### Verification Results

- `npx tsc --noEmit`: Passed (0 errors)
- `npm run lint`: Passed (0 errors, 0 warnings)
- `npx vitest run`: Passed (`18` test files, `70` tests passed, including new `tests/step-routes.test.ts`)
- `npm audit --omit=dev`: Passed (`found 0 vulnerabilities`)
- `npm run build` (`prisma generate && next build` Turbopack): Passed cleanly across all static/dynamic routes
- Headless Chrome CDP E2E (`1280x800` desktop & `390x844` mobile on `next start`):
  - Verified `crossOriginIsolated: true` on `/`, `/convert`, `/video`, zero horizontal overflow across all routes, working pill `Menu` popover, full 4-step `sphere` conversion + `.TXT` export notice, and live LibRaw WASM decoding of real CC0 `sigma-fp.dng` and `canon-r6.cr3` uploads with zero console/page errors.







