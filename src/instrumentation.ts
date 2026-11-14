import { validateBootEnv } from "@/lib/env";

export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.SKIP_ENV_VALIDATION !== "true"
  ) {
    const { missingAdminVars } = validateBootEnv(process.env);
    if (missingAdminVars.length > 0 && process.env.NODE_ENV === "production") {
      console.warn(
        `[dottoh] Server booted in client-only mode; missing admin env vars: ${missingAdminVars.join(", ")}`
      );
    }
  }
}
