import { NextResponse } from "next/server";
import { evaluateHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await evaluateHealth();
  return NextResponse.json(result.body, {
    status: result.statusCode,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
