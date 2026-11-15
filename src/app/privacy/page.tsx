import type { Metadata } from "next";
import Link from "next/link";
import { getContactEmail } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Dottoh handles photos on your device and follows Indonesia's personal data protection law (UU No. 27 Tahun 2022).",
};

const DATA_SUMMARY = [
  {
    area: "Photo and Video Tools",
    where: "Your Device",
    details:
      "Photos, camera RAW files, background edits, and saved styles stay in your browser. They are never transmitted to Dottoh servers.",
    retention:
      "Saved styles and optional history stay in browser localStorage until you clear them.",
  },
  {
    area: "Basic Service Metrics",
    where: "Server",
    details:
      "Anonymous event counts (like file format type, timing, and error code) plus hashed request rate-limit tokens.",
    retention:
      "Kept briefly without file names, photo bytes, or personal names.",
  },
  {
    area: "Admin Sign-In (/admin)",
    where: "Server",
    details:
      "Authorized admin GitHub IDs, login sessions, and AuditLog records for site settings changes.",
    retention: "Used only by site admins, never for public visitors.",
  },
] as const;

export default function PrivacyPage() {
  const contactEmail = getContactEmail();

  return (
    <div className="bg-[#ffffff] text-[#000000]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="border-b border-[#e5e5e5] pb-8">
          <p className="font-mono text-xs text-[#525252]">
            UU No. 27 Tahun 2022 (UU PDP) / Effective 2026-11-15
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-[#000000]">
            PRIVACY POLICY
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[#525252]">
            Your photos stay on your own device. Everything happens in your
            browser without sending files to our servers, in line with Indonesia
            Law No. 27 of 2022 on Personal Data Protection (UU No. 27 Tahun
            2022).
          </p>
        </div>

        <section className="border-b border-[#e5e5e5] py-8">
          <h2 className="font-sans text-lg font-medium text-[#000000]">
            What runs on your device vs. our server
          </h2>

          <div className="mt-5 overflow-x-auto border border-[#d4d4d4]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#d4d4d4] bg-[#f4f4f4] font-mono text-[#000000]">
                  <th className="p-3.5">Part</th>
                  <th className="p-3.5">Where</th>
                  <th className="p-3.5">Details</th>
                  <th className="p-3.5">Storage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] bg-[#ffffff] text-[#525252]">
                {DATA_SUMMARY.map((row) => (
                  <tr key={row.area} className="align-top">
                    <td className="p-3.5 font-medium text-[#000000]">
                      {row.area}
                    </td>
                    <td className="p-3.5 font-mono text-[#000000]">
                      {row.where}
                    </td>
                    <td className="p-3.5 leading-relaxed">{row.details}</td>
                    <td className="p-3.5 leading-relaxed">{row.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="divide-y divide-[#e5e5e5] border-b border-[#e5e5e5]">
          <section className="py-7">
            <h2 className="font-sans text-base font-medium text-[#000000]">
              1. Who runs Dottoh
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#525252]">
              Dottoh operates under Indonesian law. If you have questions or data
              requests under UU No. 27 Tahun 2022, write to{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
              >
                {contactEmail}
              </a>
              .
            </p>
          </section>

          <section className="py-7">
            <h2 className="font-sans text-base font-medium text-[#000000]">
              2. Photos and videos stay on your device
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#525252]">
              Opening photos, cutting out backgrounds, and generating ASCII
              artwork run locally inside your browser. File bytes, EXIF photo
              details, and filenames are never transmitted to Dottoh servers.
              Saved styles and optional history stay in your own browser
              localStorage and can be cleared anytime.
            </p>
          </section>

          <section className="py-7">
            <h2 className="font-sans text-base font-medium text-[#000000]">
              3. Limited service data (UU PDP Article 20)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#525252]">
              We only process minimal server data needed to keep the site fast
              and safe: anonymous conversion counts without personal info,
              temporary rate-limit hashes to stop abuse, and admin AuditLog
              entries when an allowlisted administrator updates settings.
            </p>
          </section>

          <section className="py-7">
            <h2 className="font-sans text-base font-medium text-[#000000]">
              4. Your rights under UU PDP
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#525252]">
              Under UU No. 27 Tahun 2022, you have the right to ask what data is
              stored, ask for corrections or removal of any administrative
              record, opt out of optional local history saving, or contact us with
              a privacy concern.
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border border-[#d4d4d4] bg-[#f4f4f4] p-6 sm:flex-row sm:items-center">
          <div>
            <div className="font-mono text-xs text-[#525252]">
              Privacy Contact
            </div>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-1 inline-block text-sm font-medium text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
            >
              {contactEmail}
            </a>
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
