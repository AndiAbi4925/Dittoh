import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_MAX_IMAGE_SIZE_MB } from "@/lib/constants";
import { getContactEmail } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions governing the use of the Dottoh browser-first media-to-ASCII application.",
};

interface LegalSection {
  number: string;
  title: string;
  paragraphs: string[];
}

export default function TermsPage() {
  const contactEmail = getContactEmail();

  const sections: LegalSection[] = [
    {
      number: "01",
      title: "SERVICE DESCRIPTION",
      paragraphs: [
        "Dottoh provides a free, browser-first utility for converting raster images and supported camera RAW files into ASCII artwork. Public converter features operate without user registration or login.",
      ],
    },
    {
      number: "02",
      title: "USER CONTENT AND OWNERSHIP",
      paragraphs: [
        "You retain full ownership and intellectual property rights over every file you open in Dottoh and every artwork you export. Because media processing runs locally in your browser, Dottoh claims no license, ownership, or custody over your files.",
        "You are solely responsible for ensuring that you hold the necessary rights or permissions to process and export any media you load into the application.",
      ],
    },
    {
      number: "03",
      title: "LOCAL PROCESSING AND RESOURCE LIMITS",
      paragraphs: [
        `Media decoding, optional background removal, and ASCII grid rendering execute inside your device's browser memory and Web Workers. The application enforces configurable input thresholds (currently ${DEFAULT_MAX_IMAGE_SIZE_MB} MB for static images) to protect browser stability.`,
        "Processing speed and memory availability depend on your browser engine and hardware specifications.",
      ],
    },
    {
      number: "04",
      title: "ACCEPTABLE USE",
      paragraphs: [
        "You agree not to disrupt application infrastructure, bypass API rate limits, probe protected administrative routes (/admin and /api/admin/*), or submit malformed automated telemetry requests.",
      ],
    },
    {
      number: "05",
      title: "THIRD-PARTY OPEN-SOURCE COMPONENTS",
      paragraphs: [
        "Dottoh relies on client-side open-source libraries and WebAssembly modules for RAW decoding and optional image segmentation. Output quality may vary across camera firmware revisions or proprietary compression modes.",
      ],
    },
    {
      number: "06",
      title: "DISCLAIMER OF WARRANTIES",
      paragraphs: [
        "Dottoh is provided on an 'as is' and 'as available' basis without warranties of any kind, whether express or implied, including fitness for a particular purpose, uninterrupted uptime, or compatibility with every device or file variant.",
      ],
    },
    {
      number: "07",
      title: "LIMITATION OF LIABILITY",
      paragraphs: [
        "To the maximum extent permitted by applicable law, the operators and contributors of Dottoh are not liable for any direct, indirect, incidental, or consequential damages resulting from browser crashes, device memory exhaustion, or use of exported outputs.",
      ],
    },
    {
      number: "08",
      title: "GOVERNING LAW AND CONTACT",
      paragraphs: [
        "These Terms & Conditions are governed by the laws of the Republic of Indonesia. Questions or legal notices may be directed to the project maintainer below.",
      ],
    },
  ];

  return (
    <div className="bg-[#ffffff] text-[#000000]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="border-b border-[#b1b3b3] pb-8">
          <div className="inline-flex items-center gap-2 border border-[#b1b3b3] bg-[#f4f4f4] px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[#000000]">
            <span className="inline-block h-2 w-2 bg-[#d71921]" aria-hidden="true" />
            <span>LEGAL DOCUMENT / EFFECTIVE 2026-11-15</span>
          </div>
          <h1 className="mt-5 font-display text-4xl tracking-tight text-[#000000]">
            TERMS & CONDITIONS
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#525252]">
            Governing terms for using the Dottoh media-to-ASCII studio and its
            associated web infrastructure.
          </p>
        </div>

        <div className="divide-y divide-[#b1b3b3] border-b border-[#b1b3b3]">
          {sections.map((section) => (
            <section key={section.number} className="grid grid-cols-1 gap-4 py-8 md:grid-cols-12">
              <div className="md:col-span-4">
                <span className="font-mono text-xs text-[#d71921]">
                  {section.number}
                </span>
                <h2 className="mt-1 font-mono text-sm font-medium uppercase tracking-wider text-[#000000]">
                  {section.title}
                </h2>
              </div>
              <div className="space-y-3 md:col-span-8">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-relaxed text-[#525252]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border border-[#b1b3b3] bg-[#f4f4f4] p-6 font-mono text-xs sm:flex-row sm:items-center">
          <div>
            <div className="uppercase text-[#525252]">LEGAL & OPERATOR CONTACT</div>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-1 inline-block text-sm font-medium text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
            >
              {contactEmail}
            </a>
          </div>
          <Link
            href="/privacy"
            className="dottoh-btn border border-[#000000] bg-[#000000] px-4 py-2.5 text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
          >
            READ PRIVACY POLICY
          </Link>
        </div>
      </div>
    </div>
  );
}
