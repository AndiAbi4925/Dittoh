"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { IconCloseCross } from "@/components/BrandMark";
import { BackgroundRemovalPanel } from "@/components/studio/BackgroundRemovalPanel";
import { MediaDropzone } from "@/components/studio/MediaDropzone";
import {
  DEFAULT_ENABLED_RAW_FORMATS,
  DEFAULT_MAX_IMAGE_SIZE_MB,
} from "@/lib/constants";
import { compositeRgbaBackground } from "@/lib/media/colors";
import { LocalWorkerProcessor } from "@/lib/media/local-processor";
import {
  createGeometricSampleFile,
  type ProceduralSampleVariant,
} from "@/lib/media/sample-assets";
import {
  type BackgroundFillOption,
  type BackgroundRemovalResult,
  type DecodedImagePayload,
  MediaProcessingError,
  type ProcessingProgress,
} from "@/lib/media/types";

interface ConverterWorkspaceProps {
  maxImageSizeMb?: number;
  enabledRawFormats?: readonly string[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

const INITIAL_FILL: BackgroundFillOption = {
  mode: "transparent",
  customHex: "#000000",
};

const IDLE_PROGRESS: ProcessingProgress = {
  stage: "IDLE",
  progress: 0,
  message: "Waiting for image or RAW input.",
};

export function ConverterWorkspace({
  maxImageSizeMb = DEFAULT_MAX_IMAGE_SIZE_MB,
  enabledRawFormats = DEFAULT_ENABLED_RAW_FORMATS,
  onProcessingChange,
}: ConverterWorkspaceProps) {
  const processorRef = useRef<LocalWorkerProcessor | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [decoded, setDecoded] = useState<DecodedImagePayload | null>(null);
  const [cutout, setCutout] = useState<BackgroundRemovalResult | null>(null);
  const [useCutout, setUseCutout] = useState(false);
  const [fill, setFill] = useState<BackgroundFillOption>(INITIAL_FILL);
  const [progress, setProgress] = useState<ProcessingProgress>(IDLE_PROGRESS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy =
    progress.stage !== "IDLE" &&
    progress.stage !== "READY" &&
    progress.stage !== "ERROR";

  useEffect(() => {
    onProcessingChange?.(isBusy);
  }, [isBusy, onProcessingChange]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      processorRef.current?.dispose();
    };
  }, []);

  const getProcessor = (): LocalWorkerProcessor => {
    if (!processorRef.current) {
      processorRef.current = new LocalWorkerProcessor();
    }
    return processorRef.current;
  };

  const activeBufferPayload = useMemo<DecodedImagePayload | null>(() => {
    if (!decoded) {
      return null;
    }
    if (useCutout && cutout) {
      return {
        ...decoded,
        rgba: compositeRgbaBackground(cutout.foregroundRgba, fill),
      };
    }
    return decoded;
  }, [cutout, decoded, fill, useCutout]);

  const handleFileSelected = async (file: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setErrorMessage(null);
    setCutout(null);
    setUseCutout(false);
    setFill(INITIAL_FILL);
    setFileName(file.name);
    setFileSizeBytes(file.size);

    try {
      const result = await getProcessor().decodeFile(
        file,
        {
          maxImageSizeMb,
          enabledRawFormats,
        },
        {
          signal: controller.signal,
          onProgress: (next) => setProgress(next),
        }
      );

      if (!controller.signal.aborted) {
        setDecoded(result);
      }
    } catch (error) {
      if (
        error instanceof MediaProcessingError &&
        error.code === "CANCELLED"
      ) {
        setProgress(IDLE_PROGRESS);
        return;
      }
      setDecoded(null);
      setFileName(null);
      setFileSizeBytes(null);
      const message =
        error instanceof Error ? error.message : "Media decoding failed.";
      setErrorMessage(message);
      setProgress({
        stage: "ERROR",
        progress: 0,
        message,
      });
    }
  };

  const handleSampleSelected = async (variant: ProceduralSampleVariant) => {
    try {
      setErrorMessage(null);
      const sampleFile = await createGeometricSampleFile(variant);
      await handleFileSelected(sampleFile);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create procedural sample image."
      );
    }
  };

  const handleRunCutout = async () => {
    if (!decoded) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setErrorMessage(null);
    setProgress({
      stage: "LOADING_ONNX_MODEL",
      progress: 10,
      message: "Preparing local background segmentation worker...",
    });

    try {
      const result = await getProcessor().removeBackground(decoded, {
        signal: controller.signal,
        onProgress: (next) => setProgress(next),
      });
      if (!controller.signal.aborted) {
        setCutout(result);
        setUseCutout(true);
      }
    } catch (error) {
      if (
        error instanceof MediaProcessingError &&
        error.code === "CANCELLED"
      ) {
        setProgress({
          stage: "READY",
          progress: 100,
          message: "Background removal cancelled. Using decoded original image.",
        });
        return;
      }
      const message =
        error instanceof Error ? error.message : "Background removal failed.";
      setErrorMessage(message);
      setProgress({
        stage: "ERROR",
        progress: 0,
        message,
      });
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    if (!decoded) {
      setFileName(null);
      setFileSizeBytes(null);
      setProgress(IDLE_PROGRESS);
    }
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setDecoded(null);
    setCutout(null);
    setUseCutout(false);
    setFill(INITIAL_FILL);
    setFileName(null);
    setFileSizeBytes(null);
    setErrorMessage(null);
    setProgress(IDLE_PROGRESS);
  };

  return (
    <div className="space-y-6">
      <MediaDropzone
        maxImageSizeMb={maxImageSizeMb}
        enabledRawFormats={enabledRawFormats}
        disabled={isBusy}
        fileName={fileName}
        fileSizeBytes={fileSizeBytes}
        decoded={decoded}
        onFileSelected={handleFileSelected}
        onSampleSelected={handleSampleSelected}
        onClear={handleClear}
      />

      {isBusy && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-[#000000] bg-[#ffffff] p-4"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 font-mono text-xs uppercase text-[#000000]">
              <span
                className="inline-block h-2.5 w-2.5 animate-pulse bg-[#d71921]"
                aria-hidden="true"
              />
              <span>{progress.stage.replace(/_/g, " ")}</span>
              <span className="text-[#525252]">({progress.progress}%)</span>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="dottoh-btn border border-[#000000] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#d71921] hover:text-[#d71921]"
            >
              CANCEL
            </button>
          </div>

          <p className="mt-2 font-mono text-xs text-[#525252]">
            {progress.message}
          </p>

          <div className="mt-3 h-1.5 w-full bg-[#f4f4f4]">
            <div
              className="h-full bg-[#d71921] transition-all duration-150"
              style={{ width: `${Math.max(4, Math.min(100, progress.progress))}%` }}
            />
          </div>
        </motion.div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 border border-[#d71921] bg-[#ffffff] p-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-2.5">
            <span
              className="mt-1 inline-block h-2.5 w-2.5 shrink-0 bg-[#d71921]"
              aria-hidden="true"
            />
            <div>
              <p className="font-mono text-xs font-medium uppercase text-[#d71921]">
                MEDIA PIPELINE ERROR
              </p>
              <p className="mt-1 text-sm text-[#000000]">{errorMessage}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="dottoh-btn shrink-0 border border-[#b1b3b3] bg-[#ffffff] px-3 py-1.5 text-[#000000] hover:border-[#000000]"
          >
            <IconCloseCross className="h-3.5 w-3.5" />
            <span>DISMISS</span>
          </button>
        </div>
      )}

      {decoded && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="space-y-6"
        >
          <BackgroundRemovalPanel
            decoded={decoded}
            cutout={cutout}
            useCutout={useCutout}
            fill={fill}
            isBusy={isBusy}
            onRunCutout={handleRunCutout}
            onToggleUseCutout={setUseCutout}
            onChangeFill={setFill}
            onResetCutout={() => {
              setCutout(null);
              setUseCutout(false);
              setFill(INITIAL_FILL);
            }}
          />

          {activeBufferPayload && (
            <div className="border border-[#b1b3b3] bg-[#f4f4f4] p-4 font-mono text-xs text-[#525252]">
              STAGE 03 HANDOFF READY:{" "}
              <span className="text-[#000000]">
                {activeBufferPayload.width} x {activeBufferPayload.height} RGBA
                BUFFER (
                {Math.round(activeBufferPayload.rgba.byteLength / 1024)} KB IN
                MEMORY)
              </span>{" "}
              FOR ASCII STUDIO CONTROLS (MILESTONE 4).
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
