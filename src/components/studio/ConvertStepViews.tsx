"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { AsciiControlsPanel } from "@/components/studio/AsciiControlsPanel";
import { AsciiExportPanel } from "@/components/studio/AsciiExportPanel";
import { AsciiPresetsHistoryPanel } from "@/components/studio/AsciiPresetsHistoryPanel";
import { AsciiPreviewCanvas } from "@/components/studio/AsciiPreviewCanvas";
import { BackgroundRemovalPanel } from "@/components/studio/BackgroundRemovalPanel";
import { useConverterSession } from "@/components/studio/ConverterSessionContext";
import { MediaDropzone } from "@/components/studio/MediaDropzone";
import {
  MissingPhotoCard,
  StepStatusBanners,
} from "@/components/studio/StepProgressHeader";

const STEP_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface StepPhotoViewProps {
  initialSample?: string;
}

export function StepPhotoView({ initialSample }: StepPhotoViewProps) {
  const autoLoadedRef = useRef<string | null>(null);
  const {
    maxImageSizeMb,
    enabledRawFormats,
    fileName,
    fileSizeBytes,
    decoded,
    isBusy,
    handleFileSelected,
    handleSampleSelected,
    handleClear,
  } = useConverterSession();

  useEffect(() => {
    if (
      (initialSample === "sphere" || initialSample === "monolith") &&
      !decoded &&
      !isBusy &&
      autoLoadedRef.current !== initialSample
    ) {
      autoLoadedRef.current = initialSample;
      const frame = window.requestAnimationFrame(() => {
        void handleSampleSelected(initialSample);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [decoded, handleSampleSelected, initialSample, isBusy]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: STEP_EASE }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl tracking-tight text-[#000000] sm:text-4xl">
            Choose a photo
          </h1>
          <p className="text-sm text-[#525252]">
            Step 1 of 4. Pick an image from your device or start with a sample.
          </p>
        </div>
        <Link
          href="/video"
          className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3.5 py-2 text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
        >
          Convert Video Instead
        </Link>
      </div>

      <StepStatusBanners />

      <MediaDropzone
        maxImageSizeMb={maxImageSizeMb}
        enabledRawFormats={enabledRawFormats}
        disabled={isBusy}
        fileName={fileName}
        fileSizeBytes={fileSizeBytes}
        decoded={decoded}
        onFileSelected={(file) => void handleFileSelected(file)}
        onSampleSelected={(variant) => void handleSampleSelected(variant)}
        onClear={handleClear}
      />

      {decoded && (
        <div className="flex flex-col gap-3 border-t border-[#e5e5e5] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/convert/style"
            className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
          >
            Skip to Style
          </Link>
          <Link
            href="/convert/background"
            className="dittoh-btn border border-[#000000] bg-[#000000] px-8 py-4 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
          >
            Next: Remove Background
          </Link>
        </div>
      )}
    </motion.div>
  );
}

export function StepBackgroundView() {
  const {
    decoded,
    fileName,
    cutout,
    useCutout,
    fill,
    isBusy,
    handleRunCutout,
    applyManualCutout,
    setUseCutout,
    setFill,
    resetCutout,
  } = useConverterSession();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: STEP_EASE }}
      className="space-y-6"
    >
      <div className="space-y-1.5">
        <h1 className="font-display text-3xl tracking-tight text-[#000000] sm:text-4xl">
          Background
        </h1>
        <p className="text-sm text-[#525252]">
          Step 2 of 4. Remove the background automatically or with magic-assisted manual tools, or skip as is.
        </p>
      </div>

      <StepStatusBanners />

      {!decoded ? (
        <MissingPhotoCard />
      ) : (
        <>
          <BackgroundRemovalPanel
            key={fileName ?? "photo"}
            decoded={decoded}
            cutout={cutout}
            useCutout={useCutout}
            fill={fill}
            isBusy={isBusy}
            onRunCutout={() => void handleRunCutout()}
            onApplyManualCutout={applyManualCutout}
            onToggleUseCutout={setUseCutout}
            onChangeFill={setFill}
            onResetCutout={resetCutout}
          />

          <div className="flex flex-col gap-3 border-t border-[#e5e5e5] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/convert/photo"
              className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
            >
              Back to Photo
            </Link>
            <Link
              href="/convert/style"
              className="dittoh-btn border border-[#000000] bg-[#000000] px-8 py-4 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
            >
              {cutout ? "Next: Style" : "Skip & Choose Style"}
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}

export function StepStyleView() {
  const {
    activeBufferPayload,
    fileName,
    activeGrid,
    settings,
    settingsEpoch,
    isRendering,
    renderError,
    exportWidthPx,
    savedPresets,
    history,
    historyEnabled,
    setSettings,
    resetSettings,
    applySettings,
    savePreset,
    deletePreset,
    toggleHistoryEnabled,
    clearHistory,
  } = useConverterSession();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: STEP_EASE }}
      className="space-y-6"
    >
      <div className="space-y-1.5">
        <h1 className="font-display text-3xl tracking-tight text-[#000000] sm:text-4xl">
          Customize style
        </h1>
        <p className="text-sm text-[#525252]">
          Step 3 of 4. Adjust detail, character style, and colors while checking
          the live preview.
        </p>
      </div>

      {!activeBufferPayload ? (
        <MissingPhotoCard />
      ) : (
        <>
          {renderError && (
            <div
              role="alert"
              className="border border-[#d71921] bg-[#ffffff] px-4 py-3 text-sm text-[#d71921]"
            >
              {renderError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <AsciiPreviewCanvas
                grid={activeGrid}
                settings={settings}
                isRendering={isRendering}
                fileName={fileName ?? "dittoh-image"}
                exportWidthPx={exportWidthPx}
                compareImage={activeBufferPayload}
              />
            </div>

            <div className="space-y-6 lg:col-span-5">
              <AsciiControlsPanel
                settings={settings}
                settingsEpoch={settingsEpoch}
                onChange={setSettings}
                onReset={resetSettings}
              />

              <AsciiPresetsHistoryPanel
                savedPresets={savedPresets}
                history={history}
                historyEnabled={historyEnabled}
                onSavePreset={savePreset}
                onApplyPreset={applySettings}
                onDeletePreset={deletePreset}
                onToggleHistoryEnabled={toggleHistoryEnabled}
                onClearHistory={clearHistory}
                onApplyHistoryEntry={(entry) => applySettings(entry.settings)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e5e5e5] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/convert/background"
              className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
            >
              Back to Background
            </Link>
            <Link
              href="/convert/export"
              className="dittoh-btn border border-[#000000] bg-[#000000] px-8 py-4 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
            >
              Next: Save &amp; Copy
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}

export function StepExportView() {
  const router = useRouter();
  const {
    activeBufferPayload,
    fileName,
    activeGrid,
    settings,
    isRendering,
    exportWidthPx,
    setExportWidthPx,
    handleExport,
    isExporting,
    exportNotice,
    handleClear,
  } = useConverterSession();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: STEP_EASE }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <div className="space-y-1.5">
        <h1 className="font-display text-3xl tracking-tight text-[#000000] sm:text-4xl">
          Save your art
        </h1>
        <p className="text-sm text-[#525252]">
          Step 4 of 4. Copy the text or download a file to your device.
        </p>
      </div>

      {!activeBufferPayload ? (
        <MissingPhotoCard />
      ) : (
        <>
          <AsciiExportPanel
            grid={activeGrid}
            settings={settings}
            exportWidthPx={exportWidthPx}
            onChangeExportWidthPx={setExportWidthPx}
            onExport={handleExport}
            isExporting={isExporting}
            exportNotice={exportNotice}
          />

          <AsciiPreviewCanvas
            grid={activeGrid}
            settings={settings}
            isRendering={isRendering}
            fileName={fileName ?? "dittoh-image"}
            exportWidthPx={exportWidthPx}
          />

          <div className="flex flex-col gap-3 border-t border-[#e5e5e5] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/convert/style"
              className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
            >
              Back to Style
            </Link>
            <button
              type="button"
              onClick={() => {
                handleClear();
                router.push("/convert/photo");
              }}
              className="dittoh-btn border border-[#000000] bg-[#ffffff] px-7 py-3.5 text-sm text-[#000000] hover:bg-[#000000] hover:text-[#ffffff]"
            >
              Convert Another Photo
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
