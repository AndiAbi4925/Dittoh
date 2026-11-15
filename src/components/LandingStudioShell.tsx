"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  IconArrowRight,
  IconDownloadBox,
  IconLayersCut,
  IconSlidersGrid,
  IconUploadGrid,
} from "@/components/BrandMark";
import { DotMatrixHero } from "@/components/DotMatrixHero";
import { ConverterWorkspace } from "@/components/studio/ConverterWorkspace";
import {
  DEFAULT_ENABLED_RAW_FORMATS,
  DEFAULT_MAX_IMAGE_SIZE_MB,
  SUPPORTED_EXPORT_FORMATS,
  SUPPORTED_RASTER_EXTENSIONS,
} from "@/lib/constants";

interface PipelineStage {
  id: string;
  code: string;
  title: string;
  summary: string;
  specs: string[];
  icon: "upload" | "layers" | "sliders" | "export";
}

const PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    id: "input",
    code: "01",
    title: "INPUT & RAW DECODE",
    summary:
      "Validate MIME signatures, enforce file size caps, and decode camera RAW buffers inside a dedicated Web Worker.",
    specs: [
      "PNG, JPG, WebP, HEIC/HEIF, TIFF, BMP, AVIF",
      "Verified RAW: Sony .ARW and .DNG",
      `Max input threshold: ${DEFAULT_MAX_IMAGE_SIZE_MB} MB`,
    ],
    icon: "upload",
  },
  {
    id: "background",
    code: "02",
    title: "OPTIONAL BACKGROUND CUTOUT",
    summary:
      "Lazy-load client-side segmentation weights only when enabled. Preview original vs. cutout against transparency checkerboards.",
    specs: [
      "Runs 100% locally in browser memory",
      "Transparent alpha, #000000, #ffffff, or custom hex",
      "Skippable without loading model weights",
    ],
    icon: "layers",
  },
  {
    id: "studio",
    code: "03",
    title: "ASCII STUDIO CONTROLS",
    summary:
      "Tune character ramps, density, polarity, contrast, gamma, and aspect correction with real-time Canvas rendering.",
    specs: [
      "Presets: Standard, Detailed, Minimal, Blocks, Binary, Custom",
      "Color modes: Monochrome, Original, Custom FG/BG",
      "Local custom preset and history storage",
    ],
    icon: "sliders",
  },
  {
    id: "export",
    code: "04",
    title: "STATIC MULTI-FORMAT EXPORT",
    summary:
      "Download raster, plaintext, markdown, vector SVG, or standalone styled HTML outputs with configurable dimensions.",
    specs: [
      "Formats: .PNG, .TXT, .MD, .SVG, .HTML",
      "Alpha transparency preserved in PNG and SVG",
      "Space-padded monospace alignment for TXT and MD",
    ],
    icon: "export",
  },
] as const;

function StageIcon({ kind }: { kind: PipelineStage["icon"] }) {
  switch (kind) {
    case "upload":
      return <IconUploadGrid className="h-5 w-5" />;
    case "layers":
      return <IconLayersCut className="h-5 w-5" />;
    case "sliders":
      return <IconSlidersGrid className="h-5 w-5" />;
    case "export":
      return <IconDownloadBox className="h-5 w-5" />;
  }
}

export function LandingStudioShell() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>("input");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    const container = rootRef.current;
    if (!container) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    let cancelled = false;
    let revertFn: (() => void) | null = null;

    void import("gsap").then(({ default: gsap }) => {
      if (cancelled || !rootRef.current) {
        return;
      }

      const ctx = gsap.context(() => {
        gsap.from("[data-hero-reveal]", {
          y: 14,
          opacity: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: "power2.out",
          clearProps: "transform,opacity",
        });
      }, rootRef);

      revertFn = () => ctx.revert();
    });

    return () => {
      cancelled = true;
      if (revertFn) {
        revertFn();
      }
    };
  }, []);

  const selectedStage =
    PIPELINE_STAGES.find((stage) => stage.id === selectedStageId) ??
    PIPELINE_STAGES[0];

  return (
    <div ref={rootRef} className="bg-[#ffffff] text-[#000000]">
      <section className="dottoh-dot-grid border-b border-[#b1b3b3]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-16">
          <div className="flex flex-col justify-between lg:col-span-6">
            <div>
              <div
                data-hero-reveal
                className="inline-flex items-center gap-2 border border-[#b1b3b3] bg-[#ffffff] px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#000000]"
              >
                <span className="inline-block h-2 w-2 bg-[#d71921]" aria-hidden="true" />
                <span>OPEN CONVERTER / NO LOGIN REQUIRED</span>
              </div>

              <h1
                data-hero-reveal
                className="mt-6 font-display text-4xl leading-tight tracking-tight text-[#000000] sm:text-5xl"
              >
                LOCAL MEDIA TO ASCII MATRIX.
              </h1>

              <p
                data-hero-reveal
                className="mt-5 max-w-xl text-base leading-relaxed text-[#525252]"
              >
                Dottoh converts raster images and supported camera RAW files
                into precision ASCII artwork directly inside your browser. Your
                files are decoded in Web Workers and never uploaded to a server.
              </p>

              <div data-hero-reveal className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#studio-workspace"
                  className="dottoh-btn border border-[#000000] bg-[#000000] px-5 py-3 text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
                >
                  <span>LAUNCH CONVERTER</span>
                  <IconArrowRight className="h-4 w-4" />
                </a>

                <Link
                  href="/privacy"
                  className="dottoh-btn border border-[#b1b3b3] bg-[#ffffff] px-5 py-3 text-[#000000] hover:border-[#000000]"
                >
                  <span>PRIVACY ARCHITECTURE</span>
                </Link>
              </div>
            </div>

            <dl
              data-hero-reveal
              className="mt-10 grid grid-cols-3 border border-[#b1b3b3] bg-[#ffffff] font-mono text-xs"
            >
              <div className="border-r border-[#b1b3b3] p-3.5">
                <dt className="text-[11px] uppercase text-[#525252]">EXECUTION</dt>
                <dd className="mt-1 font-medium text-[#000000]">WEB WORKER</dd>
              </div>
              <div className="border-r border-[#b1b3b3] p-3.5">
                <dt className="text-[11px] uppercase text-[#525252]">IMAGE CAP</dt>
                <dd className="mt-1 font-medium text-[#000000]">
                  {DEFAULT_MAX_IMAGE_SIZE_MB} MB
                </dd>
              </div>
              <div className="p-3.5">
                <dt className="text-[11px] uppercase text-[#525252]">EXPORTS</dt>
                <dd className="mt-1 font-medium text-[#000000]">
                  {SUPPORTED_EXPORT_FORMATS.length} FORMATS
                </dd>
              </div>
            </dl>
          </div>

          <div data-hero-reveal className="lg:col-span-6">
            <DotMatrixHero isProcessing={isProcessing} />
          </div>
        </div>
      </section>

      <section
        id="studio-workspace"
        aria-label="Local media converter workspace"
        className="border-b border-[#b1b3b3] bg-[#f4f4f4]"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-14">
          <div className="mb-6 flex flex-col justify-between gap-3 border-b border-[#b1b3b3] pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#d71921]">
                STUDIO WORKSPACE / STAGE 01 TO 05
              </p>
              <h2 className="mt-1.5 font-display text-2xl tracking-tight text-[#000000] sm:text-3xl">
                MEDIA DECODE, CUTOUT & ASCII MATRIX
              </h2>
            </div>
            <span className="border border-[#b1b3b3] bg-[#ffffff] px-3 py-1.5 font-mono text-xs uppercase text-[#525252]">
              ZERO UPLOAD / WEB WORKERS ACTIVE
            </span>
          </div>

          <ConverterWorkspace onProcessingChange={setIsProcessing} />
        </div>
      </section>

      <section id="studio-pipeline" className="border-b border-[#b1b3b3] bg-[#f4f4f4]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="flex flex-col justify-between gap-4 border-b border-[#b1b3b3] pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#d71921]">
                ARCHITECTURE SPECIFICATION
              </p>
              <h2 className="mt-2 font-display text-2xl tracking-tight text-[#000000] sm:text-3xl">
                FOUR-STAGE CLIENT WORKFLOW
              </h2>
            </div>
            <span className="border border-[#b1b3b3] bg-[#ffffff] px-3 py-1.5 font-mono text-xs uppercase text-[#525252]">
              PHASE 1 MVP SHELL
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7"
              role="tablist"
              aria-label="Conversion pipeline stages"
            >
              {PIPELINE_STAGES.map((stage) => {
                const active = stage.id === selectedStageId;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`flex flex-col items-start justify-between border p-5 text-left transition-colors rounded-[2px] ${
                      active
                        ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                        : "border-[#b1b3b3] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={`font-mono text-xs ${
                          active ? "text-[#d71921]" : "text-[#525252]"
                        }`}
                      >
                        STEP {stage.code}
                      </span>
                      <StageIcon kind={stage.icon} />
                    </div>
                    <div className="mt-6">
                      <h3 className="font-mono text-sm font-medium uppercase tracking-wider">
                        {stage.title}
                      </h3>
                      <p
                        className={`mt-2 text-xs leading-relaxed ${
                          active ? "text-[#b1b3b3]" : "text-[#525252]"
                        }`}
                      >
                        {stage.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedStage && (
              <motion.div
                key={selectedStage.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col justify-between border border-[#b1b3b3] bg-[#ffffff] p-6 lg:col-span-5"
                role="tabpanel"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#b1b3b3] pb-4 font-mono text-xs uppercase">
                    <span className="text-[#000000]">
                      STAGE {selectedStage.code} DETAIL
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#525252]">
                      <span className="inline-block h-2 w-2 bg-[#d71921]" aria-hidden="true" />
                      BROWSER ONLY
                    </span>
                  </div>

                  <h3 className="mt-5 font-display text-2xl text-[#000000]">
                    {selectedStage.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#525252]">
                    {selectedStage.summary}
                  </p>

                  <ul className="mt-6 space-y-2.5 border-t border-[#b1b3b3] pt-5 font-mono text-xs text-[#000000]">
                    {selectedStage.specs.map((spec) => (
                      <li key={spec} className="flex items-start gap-2.5">
                        <span
                          className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 bg-[#d71921]"
                          aria-hidden="true"
                        />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 border border-[#b1b3b3] bg-[#f4f4f4] p-4 font-mono text-xs text-[#525252]">
                  Input validation, LibRaw WASM decoding, and lazy U-2-Netp
                  cutout are active in the workspace above. ASCII studio sliders
                  and export generators follow in Milestone 4.
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#ffffff]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="border border-[#b1b3b3] p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-[#525252]">
                SUPPORTED INPUT MATRIX
              </p>
              <h2 className="mt-2 font-display text-2xl text-[#000000]">
                RASTER & VERIFIED CAMERA RAW
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {SUPPORTED_RASTER_EXTENSIONS.map((ext) => (
                  <span
                    key={ext}
                    className="border border-[#b1b3b3] bg-[#f4f4f4] px-2.5 py-1 font-mono text-xs uppercase text-[#000000]"
                  >
                    .{ext}
                  </span>
                ))}
                {DEFAULT_ENABLED_RAW_FORMATS.map((ext) => (
                  <span
                    key={ext}
                    className="border border-[#000000] bg-[#000000] px-2.5 py-1 font-mono text-xs uppercase text-[#ffffff]"
                  >
                    .{ext} (RAW)
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-[#b1b3b3] p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-[#525252]">
                STATIC OUTPUT TARGETS
              </p>
              <h2 className="mt-2 font-display text-2xl text-[#000000]">
                FIVE PORTABLE EXPORT FORMATS
              </h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {SUPPORTED_EXPORT_FORMATS.map((ext) => (
                  <span
                    key={ext}
                    className="border border-[#b1b3b3] bg-[#f4f4f4] px-3 py-1 font-mono text-xs uppercase text-[#000000]"
                  >
                    .{ext}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm leading-relaxed text-[#525252]">
                Review data handling guarantees under Indonesian UU No. 27 Tahun
                2022 on our{" "}
                <Link
                  href="/privacy"
                  className="text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/terms"
                  className="text-[#000000] underline underline-offset-4 hover:text-[#d71921]"
                >
                  Terms & Conditions
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
