import type { Metadata } from "next";
import Link from "next/link";
import { GuideWalkthrough } from "@/components/GuideWalkthrough";

export const metadata: Metadata = {
  title: "Guide",
  description:
    "Interactive visual walkthroughs and GIF demos showing how Dottoh turns photos and short clips into ASCII art inside your browser.",
};

export default function GuidePage() {
  return (
    <div className="bg-[#ffffff] text-[#000000]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="border-b border-[#e5e5e5] pb-8">
          <p className="font-mono text-xs text-[#d71921]">VISUAL GUIDE</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-[#000000]">
            HOW IT WORKS
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#525252]">
            Watch each step in action below. Pick Photo or Video in Convert,
            adjust your look live, and copy or download your result.
          </p>
        </div>

        <section className="border-b border-[#e5e5e5] py-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-lg font-medium text-[#000000]">
              Step-by-step GIF demo
            </h2>
            <span className="font-mono text-xs text-[#525252]">
              Click any step below to preview
            </span>
          </div>

          <GuideWalkthrough />
        </section>

        <div className="divide-y divide-[#e5e5e5] border-b border-[#e5e5e5]">
          <section className="py-8">
            <h2 className="font-sans text-lg font-medium text-[#000000]">
              Supported files
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#525252]">
              <p>
                <strong className="text-[#000000]">Standard photos:</strong> PNG,
                JPG, JPEG, WebP, HEIC, and HEIF.
              </p>
              <p>
                <strong className="text-[#000000]">Camera RAW files:</strong>{" "}
                DNG, Canon CR2 and CR3, Sony ARW, Fujifilm RAF, and standard
                Nikon NEF. Newer camera high-efficiency compression (such as
                Nikon Z6 III 8-bit HE NEF) is not supported yet, so save those
                as DNG, JPG, or PNG first if needed.
              </p>
              <p>
                <strong className="text-[#000000]">Video and GIFs:</strong> MP4
                and animated GIFs in the{" "}
                <Link
                  href="/video"
                  className="text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
                >
                  Video &amp; GIF tool
                </Link>
                .
              </p>
            </div>
          </section>

          <section className="py-8">
            <h2 className="font-sans text-lg font-medium text-[#000000]">
              Your files stay with you
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#525252]">
              All image opening, background removal, video frame rendering, and
              text art export happen directly on your own device. Nothing is sent
              to a remote server, and you never need an account.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/convert"
            className="dottoh-btn border border-[#000000] bg-[#000000] px-7 py-3.5 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
          >
            Start Converting
          </Link>
          <Link
            href="/convert/photo"
            className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
          >
            Go to Photo Step
          </Link>
          <Link
            href="/video"
            className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
          >
            Go to Video &amp; GIF
          </Link>
        </div>
      </div>
    </div>
  );
}
