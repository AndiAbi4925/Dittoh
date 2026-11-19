"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { IconCloseCross } from "@/components/BrandMark";
import { PixelLoader } from "@/components/PixelLoader";
import { useConverterSession } from "@/components/studio/ConverterSessionContext";

interface StepItem {
  number: number;
  label: string;
  href: string;
}

const STEPS: readonly StepItem[] = [
  { number: 1, label: "Photo", href: "/convert/photo" },
  { number: 2, label: "Background", href: "/convert/background" },
  { number: 3, label: "Style", href: "/convert/style" },
  { number: 4, label: "Save", href: "/convert/export" },
];

export function StepProgressHeader() {
  const pathname = usePathname();
  const { decoded, cutout, useCutout } = useConverterSession();

  if (pathname === "/convert") {
    return null;
  }

  const activeIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.href === pathname)
  );

  return (
    <nav aria-label="Converter steps" className="border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-4">
        <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {STEPS.map((step, index) => {
            const isCurrent = index === activeIndex;
            const isUnlocked = index === 0 || Boolean(decoded);
            const isDone =
              (index === 0 && Boolean(decoded) && activeIndex > 0) ||
              (index === 1 && (Boolean(cutout && useCutout) || activeIndex > 1)) ||
              (index === 2 && Boolean(decoded) && activeIndex > 2);

            const content = (
              <div
                className={`relative flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-[2px] border px-1.5 py-2 text-center transition-colors sm:flex-row sm:justify-start sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-left ${
                  isCurrent
                    ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                    : isUnlocked
                      ? "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                      : "border-[#e5e5e5] bg-[#f4f4f4] text-[#737373]"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] font-mono text-[11px] ${
                    isCurrent
                      ? "bg-[#d71921] text-[#ffffff]"
                      : isDone
                        ? "bg-[#000000] text-[#ffffff]"
                        : "bg-[#f4f4f4] text-[#525252]"
                  }`}
                >
                  {step.number}
                </span>
                <span className="max-w-full truncate font-sans text-[11px] font-medium leading-tight sm:text-sm">
                  {step.label}
                </span>
                {isCurrent && (
                  <motion.span
                    layoutId="step-active-indicator"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-x-0 -bottom-px h-[2px] bg-[#d71921]"
                    aria-hidden="true"
                  />
                )}
              </div>
            );

            if (!isUnlocked) {
              return (
                <li key={step.href}>
                  <span aria-disabled="true" className="block cursor-not-allowed">
                    {content}
                  </span>
                </li>
              );
            }

            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  aria-current={isCurrent ? "step" : undefined}
                  className="block"
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

export function StepStatusBanners() {
  const {
    isBusy,
    progress,
    progressLabel,
    errorMessage,
    dismissError,
    handleCancel,
  } = useConverterSession();

  return (
    <div className="space-y-4">
      {isBusy && (
        <div
          className="border border-[#000000] bg-[#ffffff] p-4"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-[#000000]">
              <PixelLoader size="sm" />
              <span className="font-medium">{progressLabel}</span>
              <span className="font-mono text-xs text-[#525252]">
                {Math.min(100, Math.max(0, Math.round(progress.progress)))}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#d71921] hover:text-[#d71921]"
            >
              Cancel
            </button>
          </div>

          <div className="mt-3 h-1.5 w-full bg-[#f4f4f4]">
            <div
              className="h-full bg-[#d71921] transition-all duration-150"
              style={{ width: `${Math.max(4, Math.min(100, progress.progress))}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 border border-[#d71921] bg-[#ffffff] p-4 sm:flex-row sm:items-center"
        >
          <p className="text-sm text-[#000000]">{errorMessage}</p>

          <button
            type="button"
            onClick={dismissError}
            className="dittoh-btn shrink-0 border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[#000000] hover:border-[#000000]"
          >
            <IconCloseCross className="h-3.5 w-3.5" />
            <span>Close</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function MissingPhotoCard() {
  const { handleSampleSelected, isBusy } = useConverterSession();

  return (
    <div className="mx-auto max-w-xl border border-[#d4d4d4] bg-[#ffffff] p-8 text-center">
      <h2 className="font-display text-2xl text-[#000000]">
        Pick a photo first
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-[#525252]">
        Choose an image from your device or start with a sample before moving to
        this step.
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/convert/photo"
          className="dittoh-btn w-full border border-[#000000] bg-[#000000] px-7 py-3.5 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] sm:w-auto"
        >
          Choose a Photo
        </Link>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleSampleSelected("sphere")}
          className="dittoh-btn w-full border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4] disabled:opacity-50 sm:w-auto"
        >
          Load Sample Sphere
        </button>
      </div>
    </div>
  );
}
