"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconCloseCross,
  IconDownloadBox,
  IconPause,
  IconPlay,
  IconUploadGrid,
} from "@/components/BrandMark";
import { AsciiControlsPanel } from "@/components/studio/AsciiControlsPanel";
import { AsciiPreviewCanvas } from "@/components/studio/AsciiPreviewCanvas";
import { sanitizeDownloadFilename } from "@/lib/ascii/exporters";
import { DEFAULT_ASCII_SETTINGS } from "@/lib/ascii/presets";
import { cloneAsciiSettings } from "@/lib/ascii/storage";
import { reportStudioTelemetry } from "@/lib/ascii/telemetry-client";
import type { AsciiConversionSettings, AsciiGridResult } from "@/lib/ascii/types";
import {
  DEFAULT_GIF_EXPORT_MAX_DURATION_SEC,
  DEFAULT_MAX_VIDEO_DURATION_SEC,
  DEFAULT_MAX_VIDEO_SIZE_MB,
  DEFAULT_MP4_EXPORT_MAX_FPS,
} from "@/lib/constants";
import { createProceduralSampleGifFile } from "@/lib/video/sample-clip";
import {
  convertVideoFrameToAsciiGrid,
  createTemporalAsciiState,
} from "@/lib/video/temporal-ascii";
import {
  type FrameConsistencyConfig,
  type SampledVideoFrame,
  type VideoConversionOptions,
  type VideoEncodeResult,
  type VideoExportFormat,
  type VideoMetadata,
  VideoProcessingError,
  type VideoProgressUpdate,
} from "@/lib/video/types";
import {
  buildVideoAcceptAttribute,
  clampVideoConversionOptions,
  DEFAULT_FRAME_CONSISTENCY,
} from "@/lib/video/validation";
import {
  LocalVideoProcessor,
  probeVideoMetadata,
} from "@/lib/video/video-processor";

interface VideoAsciiWorkspaceProps {
  enableVideoConverter?: boolean;
  maxVideoSizeMb?: number;
  maxVideoDurationSec?: number;
}

const IDLE_VIDEO_PROGRESS: VideoProgressUpdate = {
  stage: "IDLE",
  progress: 0,
  message: "Choose an MP4, MOV video, or animated GIF.",
};

const WIDTH_CAP_OPTIONS = [480, 640, 960, 1280] as const;
const FPS_OPTIONS = [6, 8, 10, 12] as const;

function formatByteSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function triggerVideoDownload(bytes: Uint8Array, mimeType: string, fileName: string): void {
  const blob = new Blob([Uint8Array.from(bytes)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

export function VideoAsciiWorkspace({
  enableVideoConverter = false,
  maxVideoSizeMb = DEFAULT_MAX_VIDEO_SIZE_MB,
  maxVideoDurationSec = DEFAULT_MAX_VIDEO_DURATION_SEC,
}: VideoAsciiWorkspaceProps) {
  const shouldReduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const processorRef = useRef<LocalVideoProcessor | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceMeta, setSourceMeta] = useState<VideoMetadata | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);

  const [asciiSettings, setAsciiSettings] = useState<AsciiConversionSettings>(() =>
    cloneAsciiSettings(DEFAULT_ASCII_SETTINGS)
  );
  const [settingsEpoch, setSettingsEpoch] = useState(0);

  const [outputFormat, setOutputFormat] = useState<VideoExportFormat>("mp4");
  const [targetFps, setTargetFps] = useState<number>(DEFAULT_MP4_EXPORT_MAX_FPS);
  const [targetMaxWidthPx, setTargetMaxWidthPx] = useState<number>(1280);
  const [trimStartSec, setTrimStartSec] = useState<number>(0);
  const [trimEndSec, setTrimEndSec] = useState<number>(5);
  const [consistency, setConsistency] = useState<FrameConsistencyConfig>(
    () => ({ ...DEFAULT_FRAME_CONSISTENCY })
  );

  const [progress, setProgress] = useState<VideoProgressUpdate>(IDLE_VIDEO_PROGRESS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [frames, setFrames] = useState<SampledVideoFrame[]>([]);
  const [decodeMs, setDecodeMs] = useState<number>(0);
  const [extractedOptions, setExtractedOptions] =
    useState<VideoConversionOptions | null>(null);

  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [encodedResult, setEncodedResult] = useState<VideoEncodeResult | null>(null);
  const [encodedUrl, setEncodedUrl] = useState<string | null>(null);

  const getProcessor = useCallback(() => {
    if (!processorRef.current) {
      processorRef.current = new LocalVideoProcessor();
    }
    return processorRef.current;
  }, []);

  const isBusy =
    progress.stage === "VALIDATING" ||
    progress.stage === "LOADING_FFMPEG" ||
    progress.stage === "EXTRACTING_FRAMES" ||
    progress.stage === "RENDERING_ASCII" ||
    progress.stage === "ENCODING_OUTPUT";

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      processorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sourcePreviewUrl) {
        URL.revokeObjectURL(sourcePreviewUrl);
      }
    };
  }, [sourcePreviewUrl]);

  useEffect(() => {
    return () => {
      if (encodedUrl) {
        URL.revokeObjectURL(encodedUrl);
      }
    };
  }, [encodedUrl]);

  const currentOptions = useMemo<VideoConversionOptions>(() => {
    const raw: VideoConversionOptions = {
      outputFormat,
      targetFps,
      targetMaxWidthPx,
      trimStartSec,
      trimEndSec,
      consistency,
    };
    return clampVideoConversionOptions(
      raw,
      sourceMeta?.durationSec ?? Math.max(1, trimEndSec)
    );
  }, [
    consistency,
    outputFormat,
    sourceMeta?.durationSec,
    targetFps,
    targetMaxWidthPx,
    trimEndSec,
    trimStartSec,
  ]);

  const extractionStale = useMemo(() => {
    if (!extractedOptions || frames.length === 0) {
      return false;
    }
    return (
      extractedOptions.targetFps !== currentOptions.targetFps ||
      Math.abs(extractedOptions.trimStartSec - currentOptions.trimStartSec) > 0.05 ||
      Math.abs(extractedOptions.trimEndSec - currentOptions.trimEndSec) > 0.05
    );
  }, [currentOptions, extractedOptions, frames.length]);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      return;
    }

    let rafId = 0;
    let lastTick = performance.now();
    const intervalMs = 1000 / Math.max(4, currentOptions.targetFps);

    const step = (now: number) => {
      if (now - lastTick >= intervalMs) {
        lastTick = now;
        setPreviewIndex((prev) => (prev + 1) % frames.length);
      }
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [currentOptions.targetFps, frames.length, isPlaying]);

  // Compute live ASCII grid with a bounded 5-frame lookback warm-up so scrubber and controls stay fast.
  const previewGrid = useMemo<AsciiGridResult | null>(() => {
    if (frames.length === 0) {
      return null;
    }
    const clampedIdx = Math.max(0, Math.min(frames.length - 1, previewIndex));
    const startIdx = Math.max(0, clampedIdx - 4);
    const state = createTemporalAsciiState();
    let activeGrid: AsciiGridResult | null = null;
    for (let i = startIdx; i <= clampedIdx; i += 1) {
      const frame = frames[i];
      if (!frame) continue;
      activeGrid = convertVideoFrameToAsciiGrid(
        frame.rgba,
        frame.width,
        frame.height,
        asciiSettings,
        consistency,
        state
      );
    }
    return activeGrid;
  }, [asciiSettings, consistency, frames, previewIndex]);

  const runFrameExtraction = useCallback(
    async (
      file: File,
      meta: VideoMetadata,
      options: VideoConversionOptions,
      settings: AsciiConversionSettings
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setErrorMessage(null);
      setIsPlaying(false);
      setEncodedResult(null);
      setEncodedUrl(null);
      setProgress({
        stage: "VALIDATING",
        progress: 6,
        message: "Checking video frames...",
      });

      try {
        const extracted = await getProcessor().extractSampleFrames(
          file,
          meta,
          settings,
          options,
          (update) => setProgress(update),
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        setFrames(extracted.frames);
        setDecodeMs(extracted.decodeMs);
        setExtractedOptions(extracted.optionsUsed);
        setPreviewIndex(0);
        setIsPlaying(extracted.frames.length > 1);
        setProgress({
          stage: "READY",
          progress: 100,
          message: `Ready with ${extracted.frames.length} frames.`,
        });

        reportStudioTelemetry({
          eventType: "conversion",
          inputFormat: meta.format,
          durationMs: extracted.decodeMs,
        });
      } catch (error) {
        if (
          error instanceof VideoProcessingError &&
          error.code === "CANCELLED"
        ) {
          setProgress(IDLE_VIDEO_PROGRESS);
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to extract video frames.";
        setErrorMessage(message);
        setProgress({
          stage: "ERROR",
          progress: 0,
          message,
        });
        reportStudioTelemetry({
          eventType: "error",
          inputFormat: meta.format,
          errorCode:
            error instanceof VideoProcessingError ? error.code : "VIDEO_DECODE_FAILED",
        });
      }
    },
    [getProcessor]
  );

  const handleVideoFileSelected = async (file: File) => {
    abortRef.current?.abort();
    setErrorMessage(null);
    setFrames([]);
    setEncodedResult(null);
    setEncodedUrl(null);
    setProgress({
      stage: "VALIDATING",
      progress: 4,
      message: "Opening video file...",
    });

    try {
      const meta = await probeVideoMetadata(file, {
        maxVideoSizeMb,
        maxVideoDurationSec,
      });

      const clipCap =
        outputFormat === "gif"
          ? Math.min(DEFAULT_GIF_EXPORT_MAX_DURATION_SEC, maxVideoDurationSec)
          : maxVideoDurationSec;
      const initialEnd = Math.min(meta.durationSec, clipCap);

      setSourceFile(file);
      setSourceMeta(meta);
      setSourcePreviewUrl(URL.createObjectURL(file));
      setTrimStartSec(0);
      setTrimEndSec(Number(initialEnd.toFixed(1)));

      const initialOptions = clampVideoConversionOptions(
        {
          outputFormat,
          targetFps,
          targetMaxWidthPx,
          trimStartSec: 0,
          trimEndSec: initialEnd,
          consistency,
        },
        meta.durationSec
      );

      await runFrameExtraction(file, meta, initialOptions, asciiSettings);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Video validation failed.";
      setErrorMessage(message);
      setProgress({
        stage: "ERROR",
        progress: 0,
        message,
      });
      reportStudioTelemetry({
        eventType: "error",
        errorCode:
          error instanceof VideoProcessingError ? error.code : "VIDEO_DECODE_FAILED",
      });
    }
  };

  const handleEncodeOutput = async () => {
    if (!sourceFile || !sourceMeta || frames.length === 0) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setErrorMessage(null);
    setIsPlaying(false);

    try {
      let activeFrames = frames;
      let activeDecodeMs = decodeMs;
      let activeOptions = currentOptions;

      if (extractionStale) {
        const extracted = await getProcessor().extractSampleFrames(
          sourceFile,
          sourceMeta,
          asciiSettings,
          currentOptions,
          (update) => setProgress(update),
          controller.signal
        );
        if (controller.signal.aborted) {
          return;
        }
        activeFrames = extracted.frames;
        activeDecodeMs = extracted.decodeMs;
        activeOptions = extracted.optionsUsed;
        setFrames(activeFrames);
        setDecodeMs(activeDecodeMs);
        setExtractedOptions(activeOptions);
      }

      const encoded = await getProcessor().encodeAsciiOutput(
        sourceFile.name,
        activeFrames,
        asciiSettings,
        activeOptions,
        activeDecodeMs,
        (update) => setProgress(update),
        controller.signal
      );

      if (controller.signal.aborted) {
        return;
      }

      const nextBlob = new Blob([Uint8Array.from(encoded.bytes)], {
        type: encoded.mimeType,
      });
      setEncodedResult(encoded);
      setEncodedUrl(URL.createObjectURL(nextBlob));

      reportStudioTelemetry({
        eventType: "export",
        inputFormat: sourceMeta.format,
        outputFormat: encoded.format,
        durationMs: encoded.totalMs,
      });
    } catch (error) {
      if (
        error instanceof VideoProcessingError &&
        error.code === "CANCELLED"
      ) {
        setProgress({
          stage: "READY",
          progress: 100,
          message: "Encoding cancelled. Motion preview frames remain loaded.",
        });
        return;
      }
      const message =
        error instanceof Error ? error.message : "Failed to encode video output.";
      setErrorMessage(message);
      setProgress({
        stage: "ERROR",
        progress: 0,
        message,
      });
      reportStudioTelemetry({
        eventType: "error",
        inputFormat: sourceMeta.format,
        outputFormat,
        errorCode:
          error instanceof VideoProcessingError ? error.code : "ENCODE_FAILED",
      });
    }
  };

  const handleLoadSampleGif = async () => {
    const sampleFile = createProceduralSampleGifFile();
    await handleVideoFileSelected(sampleFile);
  };

  const handleResetVideo = () => {
    abortRef.current?.abort();
    setSourceFile(null);
    setSourceMeta(null);
    setSourcePreviewUrl(null);
    setFrames([]);
    setExtractedOptions(null);
    setDecodeMs(0);
    setPreviewIndex(0);
    setIsPlaying(false);
    setEncodedResult(null);
    setEncodedUrl(null);
    setErrorMessage(null);
    setProgress(IDLE_VIDEO_PROGRESS);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleCancelActive = () => {
    abortRef.current?.abort();
  };

  if (!enableVideoConverter) {
    return (
      <div className="border border-[#d4d4d4] bg-[#f4f4f4] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#d4d4d4] pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl text-[#000000]">
              Video &amp; GIF tool is currently paused
            </h2>
            <p className="mt-1.5 text-sm text-[#525252]">
              You can still convert photos step by step right now.
            </p>
          </div>
          <Link
            href="/convert/photo"
            className="dottoh-btn shrink-0 border border-[#000000] bg-[#000000] px-5 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
          >
            Convert a Photo
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="border border-[#e5e5e5] bg-[#ffffff] p-4">
            <p className="text-xs font-medium text-[#000000]">
              Supported files
            </p>
            <p className="mt-1 text-xs text-[#525252]">
              MP4, MOV, and animated GIFs up to {maxVideoSizeMb} MB and{" "}
              {maxVideoDurationSec} seconds.
            </p>
          </div>
          <div className="border border-[#e5e5e5] bg-[#ffffff] p-4">
            <p className="text-xs font-medium text-[#000000]">
              Output formats
            </p>
            <p className="mt-1 text-xs text-[#525252]">
              Saves as an MP4 video or animated GIF right in your browser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(sourceFile || isBusy || progress.stage === "READY") && (
        <div className="flex flex-col gap-3 border border-[#d4d4d4] bg-[#ffffff] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-block h-2.5 w-2.5 ${
                isBusy || progress.stage === "ERROR"
                  ? "bg-[#d71921]"
                  : "bg-[#000000]"
              }`}
              aria-hidden="true"
            />
            <p className="text-sm text-[#000000]">{progress.message}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sourceFile && !isBusy ? (
              <button
                type="button"
                onClick={handleResetVideo}
                className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-xs text-[#000000] hover:border-[#d71921] hover:text-[#d71921]"
              >
                <IconCloseCross className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            ) : null}

            {isBusy ? (
              <button
                type="button"
                onClick={handleCancelActive}
                className="dottoh-btn border border-[#d71921] bg-[#d71921] px-3 py-1.5 text-xs text-[#ffffff] hover:border-[#000000] hover:bg-[#000000]"
              >
                <IconCloseCross className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {isBusy ? (
        <div className="border border-[#000000] bg-[#ffffff] p-4">
          <div className="flex items-center justify-between text-xs text-[#000000]">
            <span>Working on video...</span>
            <span className="font-mono">
              {Math.min(100, Math.max(0, Math.round(progress.progress)))}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-[#f4f4f4]">
            <motion.div
              className="h-full bg-[#d71921]"
              animate={{
                width: `${Math.min(100, Math.max(4, progress.progress))}%`,
              }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            />
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="border border-[#d71921] bg-[#ffffff] p-4 text-sm text-[#d71921]"
        >
          {errorMessage}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={buildVideoAcceptAttribute()}
        disabled={isBusy}
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) {
            void handleVideoFileSelected(picked);
          }
        }}
        className="sr-only"
      />

      {!sourceMeta || frames.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          aria-disabled={isBusy}
          aria-label="Drop a video or animated GIF, or click to choose a file"
          onClick={() => {
            if (!isBusy) {
              inputRef.current?.click();
            }
          }}
          onKeyDown={(event) => {
            if (!isBusy && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isBusy) {
              setIsDragging(true);
            }
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (isBusy) return;
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) {
              void handleVideoFileSelected(dropped);
            }
          }}
          className={`flex min-h-[280px] flex-col items-center justify-center border border-dashed px-6 py-12 text-center transition-colors ${
            isDragging
              ? "border-[#d71921] bg-[#f4f4f4]"
              : "border-[#000000] bg-[#ffffff] hover:bg-[#fafafa]"
          } ${isBusy ? "cursor-wait opacity-70" : "cursor-pointer"}`}
        >
          <IconUploadGrid className="h-9 w-9 text-[#000000]" />
          <h2 className="mt-5 font-display text-2xl text-[#000000]">
            Drop your video or GIF here
          </h2>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-[#525252]">
            Works with MP4, MOV, and animated GIFs up to {maxVideoSizeMb} MB and{" "}
            {maxVideoDurationSec} seconds. Everything stays in your browser.
          </p>

          <div
            className="mt-7 flex flex-col items-center gap-3 sm:flex-row"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              className="dottoh-btn w-full border border-[#000000] bg-[#000000] px-7 py-3.5 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-40 sm:w-auto"
            >
              Choose Video or GIF
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleLoadSampleGif()}
              className="dottoh-btn w-full border border-[#d4d4d4] bg-[#ffffff] px-5 py-3.5 text-xs text-[#000000] hover:border-[#000000] disabled:opacity-40 sm:w-auto"
            >
              Try Sample GIF
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="border border-[#d4d4d4] bg-[#ffffff] p-4">
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                  <p className="text-sm font-medium text-[#000000]">
                    Clip settings
                  </p>
                  <span className="font-mono text-xs text-[#d71921]">
                    {sourceMeta.format.toUpperCase()}
                  </span>
                </div>

                {sourcePreviewUrl ? (
                  <div className="mt-3 overflow-hidden border border-[#b1b3b3] bg-[#000000]">
                    {sourceMeta.format === "gif" ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- client-only blob URL for animated GIF preview */}
                        <img
                          src={sourcePreviewUrl}
                          alt={sourceFile?.name ?? "Uploaded GIF clip"}
                          className="mx-auto max-h-48 w-auto object-contain"
                        />
                      </>
                    ) : (
                      <video
                        src={sourcePreviewUrl}
                        controls
                        muted
                        loop
                        playsInline
                        className="mx-auto max-h-48 w-full object-contain"
                      />
                    )}
                  </div>
                ) : null}

                <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-[#525252]">
                  <div>
                    <dt>File</dt>
                    <dd className="truncate text-[#000000]">
                      {sourceFile?.name ?? "clip"}
                    </dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd className="text-[#000000]">
                      {sourceFile ? formatByteSize(sourceFile.size) : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Resolution</dt>
                    <dd className="text-[#000000]">
                      {sourceMeta.width} x {sourceMeta.height}
                    </dd>
                  </div>
                  <div>
                    <dt>Length</dt>
                    <dd className="text-[#000000]">
                      {sourceMeta.durationSec.toFixed(1)}s
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-4 border-t border-[#e5e5e5] pt-4">
                  <div>
                    <span className="block text-xs font-medium text-[#000000]">
                      Save format
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(["mp4", "gif"] as const).map((fmt) => {
                        const active = outputFormat === fmt;
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => {
                              setOutputFormat(fmt);
                              if (
                                fmt === "gif" &&
                                trimEndSec - trimStartSec > DEFAULT_GIF_EXPORT_MAX_DURATION_SEC
                              ) {
                                setTrimEndSec(
                                  Number(
                                    Math.min(
                                      sourceMeta.durationSec,
                                      trimStartSec + DEFAULT_GIF_EXPORT_MAX_DURATION_SEC
                                    ).toFixed(1)
                                  )
                                );
                              }
                            }}
                            className={`border px-3 py-2 font-mono text-xs rounded-[2px] ${
                              active
                                ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                                : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                            }`}
                          >
                            {fmt === "mp4" ? "MP4 Video" : "GIF (max 15s)"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="trim-start-sec"
                        className="block text-xs text-[#525252]"
                      >
                        Start (seconds)
                      </label>
                      <input
                        id="trim-start-sec"
                        type="number"
                        min={0}
                        max={Math.max(0, sourceMeta.durationSec - 0.5)}
                        step={0.5}
                        value={trimStartSec}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          if (Number.isFinite(parsed)) {
                            setTrimStartSec(Math.max(0, parsed));
                          }
                        }}
                        className="mt-1 w-full border border-[#d4d4d4] bg-[#ffffff] px-2.5 py-1.5 font-mono text-xs text-[#000000]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="trim-end-sec"
                        className="block text-xs text-[#525252]"
                      >
                        End (seconds)
                      </label>
                      <input
                        id="trim-end-sec"
                        type="number"
                        min={0.5}
                        max={sourceMeta.durationSec}
                        step={0.5}
                        value={trimEndSec}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          if (Number.isFinite(parsed)) {
                            setTrimEndSec(Math.min(sourceMeta.durationSec, parsed));
                          }
                        }}
                        className="mt-1 w-full border border-[#d4d4d4] bg-[#ffffff] px-2.5 py-1.5 font-mono text-xs text-[#000000]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-xs text-[#525252]">
                        Frames per second
                      </span>
                      <div className="mt-1.5 grid grid-cols-4 gap-1">
                        {FPS_OPTIONS.map((fpsVal) => (
                          <button
                            key={fpsVal}
                            type="button"
                            onClick={() => setTargetFps(fpsVal)}
                            className={`border py-1.5 font-mono text-[11px] rounded-[2px] ${
                              targetFps === fpsVal
                                ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                                : "border-[#d4d4d4] bg-[#ffffff] text-[#000000]"
                            }`}
                          >
                            {fpsVal}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs text-[#525252]">
                        Max width (px)
                      </span>
                      <div className="mt-1.5 grid grid-cols-4 gap-1">
                        {WIDTH_CAP_OPTIONS.map((wVal) => (
                          <button
                            key={wVal}
                            type="button"
                            onClick={() => setTargetMaxWidthPx(wVal)}
                            className={`border py-1.5 font-mono text-[11px] rounded-[2px] ${
                              targetMaxWidthPx === wVal
                                ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                                : "border-[#d4d4d4] bg-[#ffffff] text-[#000000]"
                            }`}
                          >
                            {wVal}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {extractionStale ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (sourceFile && sourceMeta) {
                          void runFrameExtraction(
                            sourceFile,
                            sourceMeta,
                            currentOptions,
                            asciiSettings
                          );
                        }
                      }}
                      className="dottoh-btn w-full border border-[#000000] bg-[#f4f4f4] px-3 py-2 text-xs text-[#000000] hover:bg-[#000000] hover:text-[#ffffff]"
                    >
                      Update Preview ({currentOptions.targetFps} fps)
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="border border-[#d4d4d4] bg-[#ffffff] p-4 space-y-4">
                <p className="border-b border-[#e5e5e5] pb-2 text-sm font-medium text-[#000000]">
                  Motion smoothing
                </p>

                <div>
                  <div className="flex justify-between text-xs text-[#525252]">
                    <span>Blend frames</span>
                    <span className="font-mono text-[#000000]">
                      {consistency.temporalSmoothing.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Blend frames"
                    min={0}
                    max={0.75}
                    step={0.05}
                    value={consistency.temporalSmoothing}
                    onChange={(e) =>
                      setConsistency((prev) => ({
                        ...prev,
                        temporalSmoothing: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full accent-[#000000]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#525252]">
                    <span>Reduce flicker</span>
                    <span className="font-mono text-[#000000]">
                      {consistency.hysteresisThreshold.toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Reduce flicker"
                    min={0}
                    max={0.1}
                    step={0.005}
                    value={consistency.hysteresisThreshold}
                    onChange={(e) =>
                      setConsistency((prev) => ({
                        ...prev,
                        hysteresisThreshold: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full accent-[#000000]"
                  />
                </div>

                <div>
                  <span className="block text-xs text-[#525252]">
                    Brightness lock
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "locked-first-frame", label: "First frame" },
                        { id: "per-frame", label: "Each frame" },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setConsistency((prev) => ({
                            ...prev,
                            luminanceMode: mode.id,
                          }))
                        }
                        className={`border px-2.5 py-1.5 font-mono text-[11px] rounded-[2px] ${
                          consistency.luminanceMode === mode.id
                            ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                            : "border-[#d4d4d4] bg-[#ffffff] text-[#000000]"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs text-[#525252]">
                    GIF color matching
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "locked-palette", label: "Shared colors" },
                        { id: "per-frame", label: "Per frame" },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setConsistency((prev) => ({
                            ...prev,
                            paletteMode: mode.id,
                          }))
                        }
                        className={`border px-2.5 py-1.5 font-mono text-[11px] rounded-[2px] ${
                          consistency.paletteMode === mode.id
                            ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                            : "border-[#d4d4d4] bg-[#ffffff] text-[#000000]"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <AsciiControlsPanel
                settings={asciiSettings}
                settingsEpoch={settingsEpoch}
                onChange={setAsciiSettings}
                onReset={() => {
                  setAsciiSettings(cloneAsciiSettings(DEFAULT_ASCII_SETTINGS));
                  setSettingsEpoch((prev) => prev + 1);
                }}
              />
            </div>

            <div className="space-y-6 lg:col-span-7">
              <div className="border border-[#d4d4d4] bg-[#ffffff] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((prev) => !prev)}
                      className="dottoh-btn border border-[#000000] bg-[#000000] px-3.5 py-2 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
                    >
                      {isPlaying ? (
                        <IconPause className="h-3.5 w-3.5" />
                      ) : (
                        <IconPlay className="h-3.5 w-3.5" />
                      )}
                      <span>{isPlaying ? "Pause" : "Play"}</span>
                    </button>

                    <span className="font-mono text-xs text-[#525252]">
                      Frame {previewIndex + 1} / {frames.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleEncodeOutput()}
                    className="dottoh-btn border border-[#d71921] bg-[#d71921] px-5 py-2.5 text-xs text-[#ffffff] hover:border-[#000000] hover:bg-[#000000] disabled:opacity-40"
                  >
                    <IconDownloadBox className="h-3.5 w-3.5" />
                    <span>Save as {outputFormat.toUpperCase()}</span>
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-[#525252]">Frame</span>
                  <input
                    type="range"
                    aria-label="Scrub video preview frame"
                    min={0}
                    max={Math.max(0, frames.length - 1)}
                    value={previewIndex}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setPreviewIndex(Number(e.target.value));
                    }}
                    className="w-full accent-[#000000]"
                  />
                </div>
              </div>

              <AsciiPreviewCanvas
                grid={previewGrid}
                settings={asciiSettings}
                isRendering={isBusy}
                fileName={sanitizeDownloadFilename(sourceFile?.name ?? "dottoh-video")}
                exportWidthPx={currentOptions.targetMaxWidthPx}
              />

              {encodedResult && encodedUrl ? (
                <div className="border border-[#000000] bg-[#ffffff] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] pb-3">
                    <div>
                      <p className="text-xs font-medium text-[#d71921]">
                        Ready to download
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-[#000000]">
                        {encodedResult.fileName} ({encodedResult.width} x{" "}
                        {encodedResult.height},{" "}
                        {formatByteSize(encodedResult.bytes.length)})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        triggerVideoDownload(
                          encodedResult.bytes,
                          encodedResult.mimeType,
                          encodedResult.fileName
                        )
                      }
                      className="dottoh-btn border border-[#000000] bg-[#000000] px-5 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
                    >
                      <IconDownloadBox className="h-3.5 w-3.5" />
                      <span>Download {encodedResult.format.toUpperCase()}</span>
                    </button>
                  </div>

                  <div className="overflow-hidden border border-[#e5e5e5] bg-[#000000]">
                    {encodedResult.format === "gif" ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- client-only blob URL for animated GIF export preview */}
                        <img
                          src={encodedUrl}
                          alt={encodedResult.fileName}
                          className="mx-auto max-h-96 w-auto object-contain"
                        />
                      </>
                    ) : (
                      <video
                        src={encodedUrl}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="mx-auto max-h-96 w-full object-contain"
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
