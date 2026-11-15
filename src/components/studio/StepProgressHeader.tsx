"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCloseCross } from "@/components/BrandMark";
import { useConverterSession } from "@/components/studio/ConverterSessionContext";

interface StepItem {
  number: number;
  label: string;
  href: string;
}

const STEPS: readonly StepItem[] = [
  { number: 1, label: "Photo", href: "/convert" },
  { number: 2, label: "Background", href: "/convert/background" },
  { number: 3, label: "Style", href: "/convert/style" },
  { number: 4, label: "Save", href: "/convert/export" },
];

export function StepProgressHeader() {
  const pathname = usePathname();
  const { decoded, cutout, useCutout } = useConverterSession();

  const activeIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.href === pathname)
  );

  return (
    <nav aria-label="Converter steps" className="border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <ol className="grid grid-cols-4 gap-2 sm:gap-3">
          {STEPS.map((step, index) => {
            const isCurrent = index === activeIndex;
            const isUnlocked = index === 0 || Boolean(decoded);
            const isDone =
              (index === 0 && Boolean(decoded) && activeIndex > 0) ||
              (index === 1 && (Boolean(cutout && useCutout) || activeIndex > 1)) ||
              (index === 2 && Boolean(decoded) && activeIndex > 2);

            const content = (
              <div
                className={`flex items-center gap-2 border px-2.5 py-2 transition-colors sm:px-3.5 sm:py-2.5 ${
                  isCurrent
                    ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                    : isUnlocked
                      ? "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                      : "border-[#e5e5e5] bg-[#f4f4f4] text-[#737373]"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center font-mono text-[11px] ${
                    isCurrent
                      ? "bg-[#d71921] text-[#ffffff]"
                      : isDone
                        ? "bg-[#000000] text-[#ffffff]"
                        : "bg-[#f4f4f4] text-[#525252]"
                  }`}
                >
                  {step.number}
                </span>
                <span className="truncate font-sans text-xs font-medium sm:text-sm">
                  {step.label}
                </span>
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
            <div className="flex items-center gap-2.5 text-sm text-[#000000]">
              <span
                className="inline-block h-2.5 w-2.5 bg-[#d71921]"
                aria-hidden="true"
              />
              <span className="font-medium">{progressLabel}</span>
              <span className="font-mono text-xs text-[#525252]">
                {Math.min(100, Math.max(0, Math.round(progress.progress)))}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#d71921] hover:text-[#d71921]"
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
            className="dottoh-btn shrink-0 border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[#000000] hover:border-[#000000]"
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
          href="/convert"
          className="dottoh-btn w-full border border-[#000000] bg-[#000000] px-7 py-3.5 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] sm:w-auto"
        >
          Choose a Photo
        </Link>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleSampleSelected("sphere")}
          className="dottoh-btn w-full border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4] disabled:opacity-50 sm:w-auto"
        >
          Load Sample Sphere
        </button>
      </div>
    </div>
  );
}
