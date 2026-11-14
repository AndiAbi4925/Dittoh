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
