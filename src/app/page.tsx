import { APP_NAME, APP_VERSION, DEFAULT_MAX_IMAGE_SIZE_MB } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#ffffff] text-[#000000] px-6 py-16">
      <div className="mx-auto max-w-4xl border border-[#b1b3b3] bg-[#f4f4f4] p-8">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#000000]">
          <span
            className="inline-block h-2.5 w-2.5 bg-[#d71921]"
            aria-hidden="true"
          />
          <span>{APP_NAME}</span>
          <span className="text-[#b1b3b3]">/</span>
          <span>v{APP_VERSION}</span>
        </div>

        <h1 className="mt-6 font-display text-4xl tracking-tight text-[#000000]">
          MEDIA TO ASCII ENGINE
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#000000]">
          Foundation initialization complete. Local browser processing pipeline
          and ASCII studio controls are scheduled for subsequent milestones.
        </p>

        <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-[#b1b3b3] pt-6 font-mono text-xs sm:grid-cols-3">
          <div>
            <dt className="text-[#666666] uppercase">Processing</dt>
            <dd className="mt-1 text-[#000000]">Client-Side Browser</dd>
          </div>
          <div>
            <dt className="text-[#666666] uppercase">Max Image Limit</dt>
            <dd className="mt-1 text-[#000000]">{DEFAULT_MAX_IMAGE_SIZE_MB} MB</dd>
          </div>
          <div>
            <dt className="text-[#666666] uppercase">Architecture</dt>
            <dd className="mt-1 text-[#000000]">Next.js App Router</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}

