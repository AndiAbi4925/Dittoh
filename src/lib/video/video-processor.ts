import { computeAsciiRows } from "@/lib/ascii/engine";
import { resolvePresetRamp } from "@/lib/ascii/presets";
import type { AsciiConversionSettings } from "@/lib/ascii/types";
import {
  DEFAULT_MAX_VIDEO_DURATION_SEC,
  DEFAULT_MAX_VIDEO_INPUT_FPS,
  DEFAULT_MAX_VIDEO_INPUT_HEIGHT_PX,
  DEFAULT_MAX_VIDEO_INPUT_WIDTH_PX,
  DEFAULT_MAX_VIDEO_SIZE_MB,
  DEFAULT_MP4_EXPORT_MAX_HEIGHT_PX,
} from "@/lib/constants";
import {
  buildExtractFramesArgs,
  buildGifEncodeArgs,
  buildMp4EncodeArgs,
  FfmpegWorkerClient,
  resolveOutputMimeType,
} from "@/lib/video/ffmpeg-client";
import { parseGifMetadata } from "@/lib/video/gif-metadata";
import {
  blitAsciiGridToRgbaFrame,
  buildGlyphAlphaAtlas,
  convertVideoFrameToAsciiGrid,
  createTemporalAsciiState,
} from "@/lib/video/temporal-ascii";
import {
  type SampledVideoFrame,
  type SupportedVideoExtension,
  type VideoConversionOptions,
  type VideoEncodeResult,
  type VideoMetadata,
  VideoProcessingError,
  type VideoProgressUpdate,
} from "@/lib/video/types";
import {
  clampVideoConversionOptions,
  computeEvenTargetDimensions,
  validateVideoCandidate,
  validateVideoMetadata,
} from "@/lib/video/validation";

function stripExtension(name: string): string {
  const clean = name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  const idx = clean.lastIndexOf(".");
  return idx > 0 ? clean.slice(0, idx) : clean || "dittoh-video";
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new VideoProcessingError(
      "CANCELLED",
      "Video processing cancelled.",
      true
    );
  }
}

async function readHeaderBytes(file: File): Promise<Uint8Array> {
  const buf = await file.slice(0, 32).arrayBuffer();
  return new Uint8Array(buf);
}

async function probeHtmlVideoMetadata(
  file: File,
  extension: SupportedVideoExtension
): Promise<VideoMetadata> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;

  try {
    const loaded = await new Promise<{
      width: number;
      height: number;
      durationSec: number;
    }>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(
          new VideoProcessingError(
            "VIDEO_DECODE_FAILED",
            "Timed out reading video container metadata.",
            true
          )
        );
      }, 10_000);

      video.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          durationSec: video.duration,
        });
      };

      video.onerror = () => {
        window.clearTimeout(timer);
        reject(
          new VideoProcessingError(
            "VIDEO_DECODE_FAILED",
            `Browser could not read .${extension.toUpperCase()} metadata.`,
            false
          )
        );
      };

      video.src = objectUrl;
    });

    return {
      width: loaded.width,
      height: loaded.height,
      durationSec: loaded.durationSec,
      estimatedFps: 30,
      format: extension,
    };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export async function probeVideoMetadata(
  file: File,
  limits: {
    maxVideoSizeMb?: number;
    maxVideoDurationSec?: number;
  } = {}
): Promise<VideoMetadata> {
  const maxVideoSizeMb = limits.maxVideoSizeMb ?? DEFAULT_MAX_VIDEO_SIZE_MB;
  const maxVideoDurationSec =
    limits.maxVideoDurationSec ?? DEFAULT_MAX_VIDEO_DURATION_SEC;

  const headerBytes = await readHeaderBytes(file);
  const { extension } = validateVideoCandidate(
    {
      name: file.name,
      size: file.size,
      type: file.type,
      headerBytes,
    },
    maxVideoSizeMb
  );

  let meta: VideoMetadata;
  if (extension === "gif") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const gifInfo = parseGifMetadata(bytes);
    meta = {
      width: gifInfo.width,
      height: gifInfo.height,
      durationSec: gifInfo.durationSec,
      estimatedFps: gifInfo.estimatedFps,
      format: "gif",
    };
  } else {
    meta = await probeHtmlVideoMetadata(file, extension);
  }

  validateVideoMetadata(meta, {
    maxDurationSec: maxVideoDurationSec,
    maxWidthPx: DEFAULT_MAX_VIDEO_INPUT_WIDTH_PX,
    maxHeightPx: DEFAULT_MAX_VIDEO_INPUT_HEIGHT_PX,
    maxFps: DEFAULT_MAX_VIDEO_INPUT_FPS,
  });

  return meta;
}

async function encodeRgbaToPngBytes(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  scratchCanvas: {
    kind: "offscreen";
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
    imageData: ImageData;
  } | {
    kind: "dom";
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    imageData: ImageData;
  }
): Promise<Uint8Array> {
  scratchCanvas.imageData.data.set(rgba);
  scratchCanvas.ctx.putImageData(scratchCanvas.imageData, 0, 0);

  if (scratchCanvas.kind === "offscreen") {
    const blob = await scratchCanvas.canvas.convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    scratchCanvas.canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Canvas PNG encoding returned empty blob."));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function createScratchPngCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (ctx) {
      return {
        kind: "offscreen" as const,
        canvas,
        ctx,
        imageData: ctx.createImageData(width, height),
      };
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) {
    throw new VideoProcessingError(
      "ENCODE_FAILED",
      "Could not allocate 2D canvas for video frame serialization.",
      true
    );
  }
  return {
    kind: "dom" as const,
    canvas,
    ctx,
    imageData: ctx.createImageData(width, height),
  };
}

export class LocalVideoProcessor {
  private ffmpeg = new FfmpegWorkerClient();

  async extractSampleFrames(
    file: File,
    meta: VideoMetadata,
    asciiSettings: AsciiConversionSettings,
    options: VideoConversionOptions,
    onProgress?: (update: VideoProgressUpdate) => void,
    signal?: AbortSignal
  ): Promise<{ frames: SampledVideoFrame[]; decodeMs: number; optionsUsed: VideoConversionOptions }> {
    const startedAt = performance.now();
    throwIfAborted(signal);

    const safeOptions = clampVideoConversionOptions(options, meta.durationSec);
    const clipDuration = Math.max(
      0.5,
      safeOptions.trimEndSec - safeOptions.trimStartSec
    );

    onProgress?.({
      stage: "LOADING_FFMPEG",
      progress: 12,
      message: "Loading self-hosted ffmpeg.wasm engine...",
    });
    await this.ffmpeg.load(signal);
    throwIfAborted(signal);

    // Decode at 2x grid width (max 320px wide) to minimize rawvideo memory while keeping sharp cell averages
    const sampleW = Math.min(320, Math.max(64, asciiSettings.columns * 2));
    const sampleH = Math.max(
      32,
      Math.round((meta.height / meta.width) * sampleW) & ~1
    );

    const inputName = `input.${meta.format}`;
    const rawOutName = "frames.raw";

    onProgress?.({
      stage: "EXTRACTING_FRAMES",
      progress: 28,
      message: `Decoding clip at ${safeOptions.targetFps} FPS (${sampleW}x${sampleH} sampler)...`,
    });

    const inputBytes = new Uint8Array(await file.arrayBuffer());
    await this.ffmpeg.writeFile(inputName, inputBytes, signal);

    try {
      const extractArgs = buildExtractFramesArgs({
        inputFile: inputName,
        outputFile: rawOutName,
        trimStartSec: safeOptions.trimStartSec,
        durationSec: clipDuration,
        fps: safeOptions.targetFps,
        width: sampleW,
        height: sampleH,
      });

      const code = await this.ffmpeg.exec(extractArgs, 60_000, signal);
      if (code !== 0) {
        throw new VideoProcessingError(
          "VIDEO_DECODE_FAILED",
          `FFmpeg failed to extract frames (exit code ${code}).`,
          true
        );
      }

      const rawAll = await this.ffmpeg.readFile(rawOutName, signal);
      const frameByteSize = sampleW * sampleH * 4;
      const frameCount = Math.floor(rawAll.length / frameByteSize);
      if (frameCount <= 0) {
        throw new VideoProcessingError(
          "VIDEO_DECODE_FAILED",
          "No video frames could be extracted from this clip range.",
          true
        );
      }

      const frames: SampledVideoFrame[] = new Array<SampledVideoFrame>(frameCount);
      for (let i = 0; i < frameCount; i += 1) {
        const start = i * frameByteSize;
        const slice = new Uint8ClampedArray(frameByteSize);
        slice.set(rawAll.subarray(start, start + frameByteSize));
        frames[i] = {
          index: i,
          timestampSec: safeOptions.trimStartSec + i / safeOptions.targetFps,
          width: sampleW,
          height: sampleH,
          rgba: slice,
        };
      }

      return {
        frames,
        decodeMs: Math.max(1, Math.round(performance.now() - startedAt)),
        optionsUsed: safeOptions,
      };
    } finally {
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(rawOutName);
    }
  }

  async encodeAsciiOutput(
    fileName: string,
    frames: readonly SampledVideoFrame[],
    asciiSettings: AsciiConversionSettings,
    options: VideoConversionOptions,
    decodeMs: number,
    onProgress?: (update: VideoProgressUpdate) => void,
    signal?: AbortSignal
  ): Promise<VideoEncodeResult> {
    if (frames.length === 0) {
      throw new VideoProcessingError(
        "VIDEO_DECODE_FAILED",
        "No decoded frames available to encode.",
        true
      );
    }

    const totalStart = performance.now();
    throwIfAborted(signal);

    await this.ffmpeg.load(signal);
    throwIfAborted(signal);

    const first = frames[0]!;
    const cols = Math.max(8, Math.min(220, Math.round(asciiSettings.columns)));
    const rows = computeAsciiRows(
      first.width,
      first.height,
      cols,
      asciiSettings.aspectRatioCorrection
    );

    const maxW = Math.min(1280, Math.max(320, options.targetMaxWidthPx));
    const maxH = DEFAULT_MP4_EXPORT_MAX_HEIGHT_PX;
    const rawCellW = maxW / cols;
    const rawCellH = rawCellW / Math.max(0.25, asciiSettings.aspectRatioCorrection);
    const desiredW = Math.round(cols * rawCellW);
    const desiredH = Math.round(rows * rawCellH);
    const targetDims = computeEvenTargetDimensions(desiredW, desiredH, maxW, maxH);

    const cellW = Math.max(4, Math.floor(targetDims.width / cols));
    const cellH = Math.max(6, Math.floor(targetDims.height / rows));
    const ramp = resolvePresetRamp(
      asciiSettings.presetId,
      asciiSettings.customCharacters
    );
    const atlas = buildGlyphAlphaAtlas(ramp, cellW, cellH);

    const renderStarted = performance.now();
    const state = createTemporalAsciiState();
    const outFrameRgba = new Uint8ClampedArray(
      targetDims.width * targetDims.height * 4
    );
    const pngCanvas = createScratchPngCanvas(targetDims.width, targetDims.height);
    const writtenFiles: string[] = [];
    const outputFile =
      options.outputFormat === "mp4" ? "output.mp4" : "output.gif";

    this.ffmpeg.onProgress((ev) => {
      const pct = Math.max(0, Math.min(1, ev.progress));
      onProgress?.({
        stage: "ENCODING_OUTPUT",
        progress: Math.round(70 + pct * 28),
        message: `Encoding ${options.outputFormat.toUpperCase()} (${Math.round(pct * 100)}%)...`,
      });
    });

    try {
      for (let i = 0; i < frames.length; i += 1) {
        throwIfAborted(signal);
        const frame = frames[i]!;
        const grid = convertVideoFrameToAsciiGrid(
          frame.rgba,
          frame.width,
          frame.height,
          asciiSettings,
          options.consistency,
          state
        );
        blitAsciiGridToRgbaFrame(
          grid,
          atlas,
          targetDims.width,
          targetDims.height,
          outFrameRgba
        );
        const pngBytes = await encodeRgbaToPngBytes(
          outFrameRgba,
          targetDims.width,
          targetDims.height,
          pngCanvas
        );
        const frameFileName = `f_${String(i).padStart(4, "0")}.png`;
        await this.ffmpeg.writeFile(frameFileName, pngBytes, signal);
        writtenFiles.push(frameFileName);

        if (i % 4 === 0 || i === frames.length - 1) {
          const pct = Math.round(35 + ((i + 1) / frames.length) * 35);
          onProgress?.({
            stage: "RENDERING_ASCII",
            progress: pct,
            message: `Rendering ASCII frame ${i + 1} / ${frames.length}...`,
          });
        }
      }

      const renderMs = Math.max(1, Math.round(performance.now() - renderStarted));
      const encodeStarted = performance.now();

      onProgress?.({
        stage: "ENCODING_OUTPUT",
        progress: 72,
        message:
          options.outputFormat === "mp4"
            ? `Encoding H.264 MP4 (${targetDims.width}x${targetDims.height}, ${options.targetFps} FPS)...`
            : `Encoding ${options.consistency.paletteMode === "locked-palette" ? "locked-palette" : "per-frame"} GIF...`,
      });

      const args =
        options.outputFormat === "mp4"
          ? buildMp4EncodeArgs({
              fps: options.targetFps,
              outputFile,
            })
          : buildGifEncodeArgs({
              fps: options.targetFps,
              paletteMode: options.consistency.paletteMode,
              outputFile,
            });

      const code = await this.ffmpeg.exec(args, 120_000, signal);
      if (code !== 0) {
        throw new VideoProcessingError(
          "ENCODE_FAILED",
          `FFmpeg encoder exited with status ${code}.`,
          true
        );
      }

      const bytes = await this.ffmpeg.readFile(outputFile, signal);
      const encodeMs = Math.max(1, Math.round(performance.now() - encodeStarted));
      const totalMs = decodeMs + Math.round(performance.now() - totalStart);

      onProgress?.({
        stage: "READY",
        progress: 100,
        message: `Completed ${options.outputFormat.toUpperCase()} export (${frames.length} frames).`,
      });

      return {
        format: options.outputFormat,
        mimeType: resolveOutputMimeType(options.outputFormat),
        fileName: `${stripExtension(fileName)}-ascii.${options.outputFormat}`,
        bytes,
        width: targetDims.width,
        height: targetDims.height,
        fps: options.targetFps,
        durationSec: frames.length / options.targetFps,
        frameCount: frames.length,
        decodeMs,
        renderMs,
        encodeMs,
        totalMs,
      };
    } finally {
      this.ffmpeg.onProgress(null);
      for (const scratch of writtenFiles) {
        await this.ffmpeg.deleteFile(scratch);
      }
      await this.ffmpeg.deleteFile(outputFile);
    }
  }

  dispose(): void {
    this.ffmpeg.terminate();
  }
}
