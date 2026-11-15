import Link from "next/link";
import { DottohMark } from "@/components/BrandMark";
import { APP_NAME } from "@/lib/constants";
import { GITHUB_REPO_URL } from "@/lib/site-constants";

export function SiteFooter({ contactEmail }: { contactEmail: string }) {
  return (
    <footer className="border-t border-[#262626] bg-[#000000] text-[#ffffff]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <DottohMark className="h-5 w-5 border border-[#262626]" />
              <span className="font-display text-base tracking-wider text-[#ffffff]">
                {APP_NAME.toUpperCase()}
              </span>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-[#b1b3b3]">
              Turn photos and clips into text art on your own device. Nothing is
              uploaded.
            </p>
          </div>

          <nav
            aria-label="Footer links"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-[#b1b3b3]"
          >
            <Link href="/convert" className="hover:text-[#ffffff]">
              Convert
            </Link>
            <Link href="/video" className="hover:text-[#ffffff]">
              Video
            </Link>
            <Link href="/guide" className="hover:text-[#ffffff]">
              Guide
            </Link>
            <Link href="/privacy" className="hover:text-[#ffffff]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#ffffff]">
              Terms
            </Link>
            <Link href="/admin" className="hover:text-[#ffffff]">
              Admin
            </Link>
            <a
              href={`mailto:${contactEmail}`}
              className="hover:text-[#ffffff]"
            >
              {contactEmail}
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#ffffff]"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

