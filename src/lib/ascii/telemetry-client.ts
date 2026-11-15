import type { TelemetryEventInput } from "@/lib/validation/admin";

export function reportStudioTelemetry(event: TelemetryEventInput): void {
  if (typeof window === "undefined") {
    return;
  }
  if (process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === "false") {
    return;
  }

  try {
    void fetch("/api/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Telemetry is strictly best-effort and never interrupts studio workflows.
  }
}
