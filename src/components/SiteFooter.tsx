import Link from "next/link";
import { DottohMark } from "@/components/BrandMark";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { GITHUB_REPO_URL } from "@/lib/site-constants";

export function SiteFooter({ contactEmail }: { contactEmail: string }) {
  return (
    <footer className="border-t border-[#262626] bg-[#000000] text-[#ffffff]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <DottohMark className="h-6 w-6 border border-[#262626]" />
              <span className="font-display text-lg tracking-wider text-[#ffffff]">
                {APP_NAME.toUpperCase()}
              </span>
              <span className="border border-[#262626] px-2 py-0.5 font-mono text-[11px] text-[#b1b3b3]">
                v{APP_VERSION}
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#b1b3b3]">
              Privacy-first media-to-ASCII studio. All image decoding,
              background segmentation, and ASCII grid rendering run locally
              inside your browser session.
            </p>
          </div>

          <div className="md:col-span-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-[#b1b3b3]">
              ROUTES
            </h2>
            <ul className="mt-4 space-y-2.5 font-mono text-xs">
              <li>
                <Link href="/" className="text-[#ffffff] hover:text-[#d71921]">
                  / STUDIO
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[#ffffff] hover:text-[#d71921]"
                >
                  / PRIVACY POLICY
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[#ffffff] hover:text-[#d71921]"
                >
                  / TERMS & CONDITIONS
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-[#ffffff] hover:text-[#d71921]"
                >
                  / ADMIN CONSOLE
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-[#b1b3b3]">
              COMPLIANCE & INFRASTRUCTURE
            </h2>
            <ul className="mt-4 space-y-2.5 font-mono text-xs text-[#ffffff]">
              <li>
                <span className="text-[#b1b3b3]">JURISDICTION: </span>
                <span>INDONESIA (UU PDP NO. 27/2022)</span>
              </li>
              <li>
                <span className="text-[#b1b3b3]">CONTACT: </span>
                <a
                  href={`mailto:${contactEmail}`}
                  className="underline decoration-[#262626] underline-offset-4 hover:text-[#d71921]"
                >
                  {contactEmail}
                </a>
              </li>
              <li>
                <span className="text-[#b1b3b3]">SOURCE: </span>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-[#262626] underline-offset-4 hover:text-[#d71921]"
                >
                  GITHUB / ANDIABI4925/DITTOH
                </a>
              </li>
              <li>
                <span className="text-[#b1b3b3]">STATUS: </span>
                <Link
                  href="/api/health"
                  className="underline decoration-[#262626] underline-offset-4 hover:text-[#d71921]"
                >
                  /API/HEALTH
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-[#262626] pt-6 font-mono text-[11px] uppercase tracking-wider text-[#b1b3b3] sm:flex-row sm:items-center">
          <span>DOTTOH STUDIO. CLIENT-SIDE MEDIA PROCESSING.</span>
          <span>NO USER MEDIA UPLOADED OR STORED ON SERVER.</span>
        </div>
      </div>
    </footer>
  );
}

