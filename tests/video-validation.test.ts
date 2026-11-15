import { describe, expect, it } from "vitest";
import {
  buildExtractFramesArgs,
  buildGifEncodeArgs,
  buildMp4EncodeArgs,
} from "@/lib/video/ffmpeg-client";
import { parseGifMetadata } from "@/lib/video/gif-metadata";
import { createProceduralSampleGifBytes } from "@/lib/video/sample-clip";
import {
  buildVideoAcceptAttribute,
  clampVideoConversionOptions,
  computeEvenTargetDimensions,
  DEFAULT_FRAME_CONSISTENCY,
  detectVideoSignature,
  validateVideoCandidate,
  validateVideoMetadata,
} from "@/lib/video/validation";

function asciiBytes(text: string): Uint8Array {
  return new Uint8Array(Array.from(text, (ch) => ch.charCodeAt(0)));
}

describe("Phase 2 video validation & magic bytes", () => {
  it("sniffs MP4, MOV, GIF, WebM, and rejects disguised binaries", () => {
    const mp4 = new Uint8Array(16);
    mp4.set(asciiBytes("ftypisom"), 4);
    expect(detectVideoSignature(mp4)).toBe("mp4");

    const mov = new Uint8Array(16);
    mov.set(asciiBytes("ftypqt  "), 4);
    expect(detectVideoSignature(mov)).toBe("mov");

    const gif = asciiBytes("GIF89a......");
    expect(detectVideoSignature(gif)).toBe("gif");

    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
    expect(detectVideoSignature(webm)).toBe("webm");

    const exe = asciiBytes("MZ\x90\x00\x03\x00\x00\x00");
    expect(detectVideoSignature(exe)).toBe("unknown");
  });

  it("enforces file size, supported extensions, and signature matching", () => {
    expect(buildVideoAcceptAttribute()).toContain(".mp4");
    expect(buildVideoAcceptAttribute()).toContain(".webm");

    expect(() =>
      validateVideoCandidate({ name: "empty.mp4", size: 0 }, 100)
    ).toThrow(/empty/i);

    expect(() =>
      validateVideoCandidate(
        { name: "huge.mp4", size: 101 * 1024 * 1024 },
        100
      )
    ).toThrow(/exceeds/i);

    expect(() =>
      validateVideoCandidate({ name: "legacy.avi", size: 1024 }, 100)
    ).toThrow(/unsupported/i);

    expect(() =>
      validateVideoCandidate(
        {
          name: "payload.mp4",
          size: 4096,
          headerBytes: asciiBytes("MZ\x90\x00\x03\x00\x00\x00"),
        },
        100
      )
    ).toThrow(/signature/i);
  });

  it("validates 1080p, 30s, 30fps input ceilings for both landscape and portrait", () => {
    expect(() =>
      validateVideoMetadata({
        width: 1920,
        height: 1080,
        durationSec: 30,
        estimatedFps: 30,
        format: "mp4",
      })
    ).not.toThrow();

    expect(() =>
      validateVideoMetadata({
        width: 1080,
        height: 1920,
        durationSec: 25,
        estimatedFps: 30,
        format: "mov",
      })
    ).not.toThrow();

    expect(() =>
      validateVideoMetadata({
        width: 3840,
        height: 2160,
        durationSec: 5,
        estimatedFps: 24,
        format: "mp4",
      })
    ).toThrow(/1080p/i);

    expect(() =>
      validateVideoMetadata({
        width: 1280,
        height: 720,
        durationSec: 35,
        estimatedFps: 24,
        format: "mp4",
      })
    ).toThrow(/30s limit/i);

    expect(() =>
      validateVideoMetadata({
        width: 1280,
        height: 720,
        durationSec: 5,
        estimatedFps: 60,
        format: "webm",
      })
    ).toThrow(/30 FPS/i);
  });

  it("clamps GIF exports to 15s, MP4 exports to 12fps and 720p even dimensions", () => {
    const gifClamped = clampVideoConversionOptions(
      {
        outputFormat: "gif",
        targetFps: 24,
        targetMaxWidthPx: 1920,
        trimStartSec: 2,
        trimEndSec: 28,
        consistency: DEFAULT_FRAME_CONSISTENCY,
      },
      29
    );

    expect(gifClamped.targetFps).toBe(12);
    expect(gifClamped.targetMaxWidthPx).toBe(1280);
    expect(gifClamped.trimEndSec - gifClamped.trimStartSec).toBe(15);

    const dims = computeEvenTargetDimensions(1921, 1081, 1280, 720);
    expect(dims.width).toBeLessThanOrEqual(1280);
    expect(dims.height).toBeLessThanOrEqual(720);
    expect(dims.width % 2).toBe(0);
    expect(dims.height % 2).toBe(0);
  });

  it("round-trips procedural sample GIF bytes through GIF metadata parser", () => {
    const sampleBytes = createProceduralSampleGifBytes({
      width: 160,
      height: 90,
      frameCount: 20,
      delayCs: 10,
    });
    const meta = parseGifMetadata(sampleBytes);
    expect(meta.width).toBe(160);
    expect(meta.height).toBe(90);
    expect(meta.frameCount).toBe(20);
    expect(meta.durationSec).toBeCloseTo(2.0, 2);
    expect(meta.estimatedFps).toBeCloseTo(10, 1);
  });

  it("builds deterministic FFmpeg CLI arguments for extract, MP4, and GIF modes", () => {
    const extract = buildExtractFramesArgs({
      inputFile: "in.mp4",
      trimStartSec: 1.5,
      durationSec: 10,
      fps: 12,
      width: 200,
      height: 112,
    });
    expect(extract).toContain("rgba");
    expect(extract).toContain("fps=12,scale=200:112:flags=area");

    const mp4Args = buildMp4EncodeArgs({ fps: 12 });
    expect(mp4Args).toContain("libx264");
    expect(mp4Args).toContain("yuv420p");

    const gifLocked = buildGifEncodeArgs({
      fps: 10,
      paletteMode: "locked-palette",
    });
    expect(gifLocked.join(" ")).toContain("stats_mode=full");

    const gifPerFrame = buildGifEncodeArgs({
      fps: 10,
      paletteMode: "per-frame",
    });
    expect(gifPerFrame.join(" ")).toContain("stats_mode=single");
  });
});
