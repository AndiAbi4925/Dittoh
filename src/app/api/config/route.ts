import { NextResponse } from "next/server";
import { getPublicAppConfig } from "@/lib/app-config";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const config = await getPublicAppConfig();
  return NextResponse.json(config, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
