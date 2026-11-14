import type { Metadata } from "next";
import Link from "next/link";
import { getContactEmail } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Dottoh Privacy Policy compliant with Indonesia Law No. 27 of 2022 (UU PDP), detailing local browser media processing and minimal infrastructure metadata.",
};

interface ProcessingBoundaryRow {
  surface: string;
  location: string;
  dataHandled: string;
  retention: string;
}

const PROCESSING_BOUNDARIES: readonly ProcessingBoundaryRow[] = [
  {
    surface: "Public Converter Studio (/)",
    location: "Your Browser (Web Worker + Canvas)",
    dataHandled:
      "Uploaded images, camera RAW files, background masks, custom presets, and exported ASCII files.",
    retention:
      "Never transmitted to Dottoh servers. Optional presets/history stay in your localStorage until you clear them.",
  },
  {
    surface: "Operational Telemetry & Rate Limiting",
    location: "Vercel & Neon PostgreSQL (Minimal Metadata)",
    dataHandled:
      "Anonymous event type, file format category, conversion duration bucket, error code, and one-way hashed request tokens.",
    retention:
      "Stored without filenames, image bytes, or user identities for operational stability and abuse prevention.",
  },
  {
    surface: "Admin Console (/admin)",
    location: "Server-Side Auth.js + PostgreSQL",
    dataHandled:
      "Allowlisted administrator GitHub user ID, GitHub handle, session cookies, and administrative AuditLog records.",
    retention:
      "Restricted exclusively to authorized system administrators; never collected from public converter visitors.",
  },
] as const;

export default function PrivacyPage() {
  const contactEmail = getContactEmail();

  return (
    <div className="bg-[#ffffff] text-[#000000]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="border-b border-[#b1b3b3] pb-8">
          <div className="inline-flex items-center gap-2 border border-[#b1b3b3] bg-[#f4f4f4] px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[#000000]">
            <span className="inline-block h-2 w-2 bg-[#d71921]" aria-hidden="true" />
            <span>UU NO. 27 TAHUN 2022 (UU PDP) / EFFECTIVE 2026-11-15</span>
          </div>
          <h1 className="mt-5 font-display text-4xl tracking-tight text-[#000000]">
            PRIVACY POLICY
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#525252]">
            Dottoh is engineered so your media files remain on your own device.
            This policy explains the clear technical boundary between local
            browser media processing and minimal server telemetry or admin
            infrastructure in accordance with Law No. 27 of 2022 on Personal
            Data Protection of the Republic of Indonesia (UU PDP).
          </p>
        </div>

        <section className="py-8 border-b border-[#b1b3b3]">
          <p className="font-mono text-xs uppercase tracking-widest text-[#d71921]">
            ARCHITECTURAL DATA BOUNDARY
          </p>
          <h2 className="mt-2 font-display text-2xl text-[#000000]">
            LOCAL PROCESSING VS. SERVER INFRASTRUCTURE
          </h2>

          <div className="mt-6 overflow-x-auto border border-[#b1b3b3]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#b1b3b3] bg-[#f4f4f4] font-mono uppercase text-[#000000]">
                  <th className="p-3.5">Component</th>
                  <th className="p-3.5">Execution Location</th>
                  <th className="p-3.5">Data Handled</th>
                  <th className="p-3.5">Storage & Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b1b3b3] bg-[#ffffff] text-[#525252]">
                {PROCESSING_BOUNDARIES.map((row) => (
                  <tr key={row.surface} className="align-top">
                    <td className="p-3.5 font-mono font-medium text-[#000000]">
                      {row.surface}
                    </td>
                    <td className="p-3.5 font-mono text-[#000000]">
                      {row.location}
                    </td>
                    <td className="p-3.5 leading-relaxed">{row.dataHandled}</td>
                    <td className="p-3.5 leading-relaxed">{row.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="divide-y divide-[#b1b3b3] border-b border-[#b1b3b3]">
          <section className="grid grid-cols-1 gap-4 py-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <span className="font-mono text-xs text-[#d71921]">01</span>
              <h2 className="mt-1 font-mono text-sm font-medium uppercase tracking-wider">
                DATA CONTROLLER IDENTITY
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-[#525252] md:col-span-8">
              <p>
                Dottoh is operated under the jurisdiction of the Republic of
                Indonesia. For all personal data inquiries, access requests, or
                deletion requests under UU No. 27 Tahun 2022, contact{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
                >
                  {contactEmail}
                </a>
                .
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 py-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <span className="font-mono text-xs text-[#d71921]">02</span>
              <h2 className="mt-1 font-mono text-sm font-medium uppercase tracking-wider">
                NO SERVER UPLOAD OF USER MEDIA
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-[#525252] md:col-span-8">
              <p>
                All file validation, camera RAW decoding, optional background
                segmentation, and ASCII conversion run entirely inside your
                browser using WebAssembly, Web Workers, and Canvas. Image bytes,
                EXIF metadata, filenames, and exported ASCII files are never
                transmitted to Dottoh servers.
              </p>
              <p>
                Saved custom presets and optional conversion history reside
                solely in your browser&apos;s localStorage and can be erased at
                any time using the clear-history control or browser storage
                settings.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 py-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <span className="font-mono text-xs text-[#d71921]">03</span>
              <h2 className="mt-1 font-mono text-sm font-medium uppercase tracking-wider">
                LEGAL BASIS & PURPOSE (UU PDP)
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-[#525252] md:col-span-8">
              <p>
                Minimal infrastructure data is processed strictly under Article
                20 of UU No. 27 Tahun 2022 on the following legal bases:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-[#000000]">Legitimate Interest & Security:</strong>{" "}
                  Protecting API endpoints through rate limiting, transport
                  security headers, and error diagnostics.
                </li>
                <li>
                  <strong className="text-[#000000]">Consent / User Configuration:</strong>{" "}
                  Anonymous operational telemetry events (format category,
                  latency timing, error code) containing no personally
                  identifiable content.
                </li>
                <li>
                  <strong className="text-[#000000]">Administrative Accountability:</strong>{" "}
                  GitHub OAuth identification and immutable AuditLog entries for
                  allowlisted administrators managing /admin.
                </li>
              </ul>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 py-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <span className="font-mono text-xs text-[#d71921]">04</span>
              <h2 className="mt-1 font-mono text-sm font-medium uppercase tracking-wider">
                INFRASTRUCTURE & CROSS-BORDER TRANSIT
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-[#525252] md:col-span-8">
              <p>
                Static application delivery and serverless API execution are
                hosted on Vercel, and operational telemetry and admin
                configuration metadata are stored in Neon PostgreSQL. When edge
                requests traverse international CDN nodes, only standard HTTP
                request headers and non-media operational metadata are handled.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 py-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <span className="font-mono text-xs text-[#d71921]">05</span>
              <h2 className="mt-1 font-mono text-sm font-medium uppercase tracking-wider">
                YOUR RIGHTS UNDER UU PDP NO. 27/2022
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-[#525252] md:col-span-8">
              <p>
                Subject to applicable provisions of Indonesian Law No. 27 of
                2022, you have the right to:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Obtain clarity on the identity, legal basis, and purpose of data processing.</li>
                <li>Request access to, correction of, or erasure of any personal data held in administrative records.</li>
                <li>Withdraw consent or object to optional operational telemetry collection.</li>
                <li>Request restriction of processing or file a complaint with the competent Indonesian data protection authority.</li>
              </ul>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 py-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <span className="font-mono text-xs text-[#d71921]">06</span>
              <h2 className="mt-1 font-mono text-sm font-medium uppercase tracking-wider">
                SECURITY CONTROLS
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-[#525252] md:col-span-8">
              <p>
                Dottoh enforces HTTPS with HSTS, strict Content Security Policy
                (CSP), X-Frame-Options: DENY, same-origin API CORS restrictions,
                HttpOnly/Secure session cookies, and server-side numeric GitHub
                ID allowlisting for administrative actions.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border border-[#b1b3b3] bg-[#f4f4f4] p-6 font-mono text-xs sm:flex-row sm:items-center">
          <div>
            <div className="uppercase text-[#525252]">DATA PROTECTION CONTACT</div>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-1 inline-block text-sm font-medium text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
            >
              {contactEmail}
            </a>
          </div>
          <Link
            href="/terms"
            className="dottoh-btn border border-[#000000] bg-[#000000] px-4 py-2.5 text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
          >
            READ TERMS & CONDITIONS
          </Link>
        </div>
      </div>
    </div>
  );
}
