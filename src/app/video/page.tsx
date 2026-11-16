import type { Metadata } from "next";
import Link from "next/link";
import { VideoAsciiWorkspace } from "@/components/studio/VideoAsciiWorkspace";
import { getPublicAppConfig } from "@/lib/app-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Video & GIF to ASCII",
  description:
    "Turn MP4 videos and animated GIFs into ASCII animations right in your browser.",
};

export default async function VideoPage() {
  const appConfig = await getPublicAppConfig();

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#ffffff] text-[#000000]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#e5e5e5] pb-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-3xl tracking-tight text-[#000000] sm:text-4xl">
              Video &amp; GIF to ASCII
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#525252]">
              Pick an MP4 video or animated GIF, preview the look frame by frame,
              and save a new MP4 or GIF in your browser.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href="/convert"
              className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-4 py-2.5 text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
            >
              Switch Mode
            </Link>
            <Link
              href="/convert/photo"
              className="dottoh-btn border border-[#000000] bg-[#000000] px-4 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
            >
              Convert a Photo
            </Link>
          </div>
        </div>

        <VideoAsciiWorkspace
          enableVideoConverter={appConfig.enableVideoConverter}
          maxVideoSizeMb={appConfig.maxVideoSizeMb}
          maxVideoDurationSec={appConfig.maxVideoDurationSec}
        />
      </div>
    </div>
  );
}
