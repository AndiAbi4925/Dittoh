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


