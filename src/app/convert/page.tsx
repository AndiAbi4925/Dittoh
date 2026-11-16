import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConvertModeSelector } from "@/components/studio/ConvertModeSelector";
import { getPublicAppConfig } from "@/lib/app-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convert Photo or Video",
  description:
    "Choose whether to turn a photo into ASCII art step by step or convert an MP4 video or GIF.",
};

interface ConvertPageProps {
  searchParams: Promise<{ sample?: string }>;
}

export default async function ConvertPage({ searchParams }: ConvertPageProps) {
  const params = await searchParams;
  if (params.sample === "sphere" || params.sample === "monolith") {
    redirect(`/convert/photo?sample=${params.sample}`);
  }

  const appConfig = await getPublicAppConfig();

  return (
    <ConvertModeSelector
      enableVideoConverter={appConfig.enableVideoConverter}
      maxImageSizeMb={appConfig.maxImageSizeMb}
      maxVideoSizeMb={appConfig.maxVideoSizeMb}
      maxVideoDurationSec={appConfig.maxVideoDurationSec}
    />
  );
}
