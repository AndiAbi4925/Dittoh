# Dittoh

Browser-first media-to-ASCII conversion studio built with Next.js App Router, TypeScript, Tailwind CSS v4, Prisma, and Auth.js.

## Architecture Overview

- **Client-Side Media Pipeline**: Media validation, RAW decoding, background removal, and ASCII rendering run locally in the browser via Web Workers, WebAssembly, and Canvas.
- **Backend Infrastructure**: Minimal Next.js App Router API routes backed by Neon PostgreSQL (Prisma 7 + `@prisma/adapter-neon`) and GitHub OAuth admin allowlisting (`/admin`) via Auth.js v5.
- **Security Posture**: Zod-validated environment configuration, strict CSP (`'wasm-unsafe-eval'` without `'unsafe-eval'` in production), HSTS, `X-Frame-Options: DENY`, same-origin CORS proxy, and server-side allowlist verification.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `env.example` to `.env.local` and fill in your Neon PostgreSQL connection string, `AUTH_SECRET`, GitHub OAuth credentials, and numeric `GITHUB_ADMIN_IDS`.

3. Generate Prisma client and start the development server:

```bash
npm run db:generate
npm run dev
```

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Generate Prisma client and run production build
- `npm run typecheck` - Run TypeScript strict type checking (`tsc --noEmit`)
- `npm run lint` - Run ESLint across the repository
- `npm test` - Run Vitest unit tests
- `npm run db:push` - Push Prisma schema to Neon PostgreSQL
