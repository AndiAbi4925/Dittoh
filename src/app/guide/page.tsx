import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guide",
  description:
    "How Dottoh turns photos and short clips into ASCII art inside your browser, plus supported image formats.",
};

export default function GuidePage() {
  return (
    <div className="bg-[#ffffff] text-[#000000]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="border-b border-[#e5e5e5] pb-8">
          <h1 className="font-display text-4xl tracking-tight text-[#000000]">
            HOW IT WORKS
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[#525252]">
            Dottoh converts your photo or short clip into characters one step at
            a time so each screen stays focused and easy to use.
          </p>
        </div>

        <div className="divide-y divide-[#e5e5e5] border-b border-[#e5e5e5]">
          <section className="py-8">
            <h2 className="font-sans text-lg font-medium text-[#000000]">
              Four simple steps for photos
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[#525252]">
              <li>
                <strong className="text-[#000000]">1. Upload a photo:</strong>{" "}
                Pick a file from your device or try a built-in sample photo.
              </li>
              <li>
                <strong className="text-[#000000]">
                  2. Remove background (optional):
                </strong>{" "}
                Keep the full photo or cut out the main subject and pick a clean
                background color.
              </li>
              <li>
                <strong className="text-[#000000]">3. Customize the style:</strong>{" "}
                Change width, character style, brightness, contrast, or color
                mode while watching the live preview.
              </li>
              <li>
                <strong className="text-[#000000]">4. Save or copy:</strong>{" "}
                Copy the text directly or download PNG, TXT, Markdown, SVG, or
                HTML.
              </li>
            </ol>
          </section>

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
              Your photos stay with you
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#525252]">
              All image opening, background removal, and text rendering happen
              on your own device. Nothing is sent to a remote server, and you
              never need an account.
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
            href="/video"
            className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
          >
            Open Video &amp; GIF Tool
          </Link>
        </div>
      </div>
    </div>
  );
}
