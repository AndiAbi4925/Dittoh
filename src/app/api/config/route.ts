import { NextResponse } from "next/server";
import { getPublicAppConfig } from "@/lib/app-config";

export async function GET(): Promise<NextResponse> {
  const config = await getPublicAppConfig();
  return NextResponse.json(config, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
