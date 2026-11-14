import * as UTIF from "utif";
import { describe, expect, it } from "vitest";
import {
  compositeRgbaBackground,
  isValidHexColor,
  normalizeHexColor,
  resolveBackgroundFill,
} from "@/lib/media/colors";
import {
  computeWorkingDimensions,
  convertRawSamplesToRgba,
  downsampleRgbaBilinear,
} from "@/lib/media/pixel-utils";
import { decodeTiffBuffer } from "@/lib/media/tiff-decoder";
import {
  postprocessU2NetMask,
  prepareU2NetInputTensor,
  U2NET_INPUT_SIZE,
} from "@/lib/media/u2net-preprocess";

describe("media color compositing and pixel utilities", () => {
  it("normalizes hex strings and composites transparent cutouts over fills", () => {
    expect(normalizeHexColor("#D71921")).toBe("#d71921");
    expect(normalizeHexColor("fff")).toBe("#ffffff");
    expect(isValidHexColor("not-a-hex")).toBe(false);
    expect(resolveBackgroundFill({ mode: "transparent", customHex: "#000000" })).toBeNull();
    expect(resolveBackgroundFill({ mode: "custom", customHex: "#d71921" })).toEqual({
      r: 215,
      g: 25,
      b: 33,
      a: 255,
    });

    const fg = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 0,
      0, 0, 255, 128,
    ]);

    const transparentOut = compositeRgbaBackground(fg, {
      mode: "transparent",
      customHex: "#000000",
    });
    expect(Array.from(transparentOut)).toEqual(Array.from(fg));

    const blackOut = compositeRgbaBackground(fg, {
      mode: "black",
      customHex: "#000000",
    });
    expect(Array.from(blackOut.subarray(0, 8))).toEqual([255, 0, 0, 255, 0, 0, 0, 255]);
    expect(blackOut[11]).toBe(255);
  });

  it("downsamples large dimensions proportionally and converts RGB/16-bit RAW buffers", () => {
    expect(computeWorkingDimensions(6000, 4000, 2048)).toEqual({
      width: 2048,
      height: 1365,
      wasDownsampled: true,
    });
    expect(computeWorkingDimensions(800, 600, 2048)).toEqual({
      width: 800,
      height: 600,
      wasDownsampled: false,
    });

    const src = new Uint8ClampedArray(4 * 4 * 4).fill(200);
    const down = downsampleRgbaBilinear(src, 4, 4, 2, 2);
    expect(down.length).toBe(2 * 2 * 4);
    expect(down[0]).toBe(200);

    const raw16 = new Uint16Array([65535, 32768, 0]);
    const converted = convertRawSamplesToRgba(raw16, 1, 1, 3);
    expect(Array.from(converted)).toEqual([255, 128, 0, 255]);
  });

  it("prepares 320x320 ImageNet NCHW tensors and reconstructs aligned alpha mattes", () => {
    const srcW = 100;
    const srcH = 50;
    const rgba = new Uint8ClampedArray(srcW * srcH * 4);
    for (let i = 0; i < srcW * srcH; i += 1) {
      rgba[i * 4] = 240;
      rgba[i * 4 + 1] = 240;
      rgba[i * 4 + 2] = 240;
      rgba[i * 4 + 3] = 255;
    }

    const prepared = prepareU2NetInputTensor(rgba, srcW, srcH);
    expect(prepared.tensorData.length).toBe(3 * U2NET_INPUT_SIZE * U2NET_INPUT_SIZE);
    expect(prepared.resizedW).toBe(320);
    expect(prepared.resizedH).toBe(160);
    expect(prepared.padX).toBe(0);
    expect(prepared.padY).toBe(80);

    const fakeMask = new Float32Array(U2NET_INPUT_SIZE * U2NET_INPUT_SIZE);
    for (let y = 80; y < 240; y += 1) {
      for (let x = 0; x < 320; x += 1) {
        fakeMask[y * U2NET_INPUT_SIZE + x] = x < 160 ? 0.95 : 0.05;
      }
    }

    const post = postprocessU2NetMask(fakeMask, rgba, prepared);
    expect(post.alphaMask.length).toBe(srcW * srcH);
    expect(post.alphaMask[25 * srcW + 10]).toBeGreaterThan(240);
    expect(post.alphaMask[25 * srcW + 90]).toBeLessThan(15);
  });

  it("decodes TIFF buffers deterministically via pure-JS UTIF", () => {
    const sourceRgba = new Uint8Array([
      215, 25, 33, 255,
      255, 255, 255, 255,
      0, 0, 0, 255,
      128, 128, 128, 255,
    ]);
    const tiffBuffer = UTIF.encodeImage(sourceRgba, 2, 2);
    const decoded = decodeTiffBuffer(tiffBuffer);
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(2);
    expect(decoded.rgba[0]).toBe(215);
    expect(decoded.rgba[1]).toBe(25);
    expect(decoded.rgba[2]).toBe(33);
  });
});
