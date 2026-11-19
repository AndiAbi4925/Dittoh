import type { Metadata } from "next";
import Link from "next/link";
import { CopyEmailButton } from "@/components/CopyEmailButton";
import { DEFAULT_MAX_IMAGE_SIZE_MB } from "@/lib/constants";
import { getContactEmail } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Simple terms explaining how you can use Dottoh and that you keep full ownership of every file.",
};

interface LegalSection {
  title: string;
  body: string;
}

export default function TermsPage() {
  const contactEmail = getContactEmail();

  const sections: LegalSection[] = [
    {
      title: "1. What Dottoh does",
      body: "Dottoh is a free browser tool for turning photos and short clips into ASCII art. No account or sign-up is needed.",
    },
    {
      title: "2. Your files remain yours",
      body: "You retain full ownership of every image you open and every result you download or copy. Since everything runs on your device, Dottoh never claims rights over your pictures. Make sure you have permission to use any file you convert.",
    },
    {
      title: "3. File limits and device speed",
      body: `To keep your browser running smoothly, photos are capped at ${DEFAULT_MAX_IMAGE_SIZE_MB} MB by default. Speed depends on your phone or computer hardware.`,
    },
    {
      title: "4. Fair use",
      body: "Please do not overload the service, bypass rate limits, or attempt unauthorized access to /admin or /api/admin/*.",
    },
    {
      title: "5. As-is service",
      body: "Dottoh uses open-source tools inside your browser and is provided as-is. Support for camera RAW files can vary between camera models.",
    },
    {
      title: "6. Governing law",
      body: "These terms are governed by the laws of the Republic of Indonesia.",
    },
  ];

  return (
    <div className="bg-[#ffffff] text-[#000000]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="border-b border-[#e5e5e5] pb-8">
          <p className="font-mono text-xs text-[#525252]">
            Effective 2026-11-15 / Last updated: 2026-11-19
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-[#000000]">
            TERMS &amp; CONDITIONS
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[#525252]">
            Clear, plain rules for using Dottoh.
          </p>
        </div>

        <div className="divide-y divide-[#e5e5e5] border-b border-[#e5e5e5]">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="font-sans text-base font-medium text-[#000000]">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#525252]">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border border-[#d4d4d4] bg-[#f4f4f4] p-6 sm:flex-row sm:items-center">
          <div>
            <div className="font-mono text-xs text-[#525252]">Questions</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-block text-sm font-medium text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
              >
                {contactEmail}
              </a>
              <CopyEmailButton email={contactEmail} />
            </div>
          </div>
          <Link
            href="/convert"
            className="dottoh-btn border border-[#000000] bg-[#000000] px-5 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
          >
            Start Converting
          </Link>
        </div>
      </div>
    </div>
  );
}
