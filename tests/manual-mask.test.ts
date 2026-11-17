import { describe, expect, it } from "vitest";
import {
  applyBrushMask,
  applyMagicWandMask,
  createCutoutFromMask,
  createInitialAlphaMask,
  invertAlphaMask,
} from "@/lib/media/manual-mask";

function makeSplitImage(width: number, height: number): Uint8ClampedArray {
  // Left half (x < width/2): bright white background (250, 250, 250)
  // Right half (x >= width/2): dark red subject (180, 20, 20)
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      if (x < width / 2) {
        rgba[idx] = 250;
        rgba[idx + 1] = 250;
        rgba[idx + 2] = 250;
      } else {
        rgba[idx] = 180;
        rgba[idx + 1] = 20;
        rgba[idx + 2] = 20;
      }
      rgba[idx + 3] = 255;
    }
  }
  return rgba;
}

describe("manual and magic-assisted background mask tools", () => {
  it("magic wand erases connected matching region and respects high-contrast borders", () => {
    const width = 10;
    const height = 10;
    const rgba = makeSplitImage(width, height);
    // Add an isolated white spot inside the right dark-red side at (8, 5)
    const islandIdx = (5 * width + 8) * 4;
    rgba[islandIdx] = 250;
    rgba[islandIdx + 1] = 250;
    rgba[islandIdx + 2] = 250;

    const initial = createInitialAlphaMask(rgba, width, height);

    const contiguousErase = applyMagicWandMask({
      srcRgba: rgba,
      alphaMask: initial,
      width,
      height,
      seedX: 1,
      seedY: 1,
      tolerance: 20,
      action: "erase",
      contiguous: true,
      feather: false,
    });

    // Connected left background erased
    expect(contiguousErase[0]).toBe(0);
    expect(contiguousErase[5 * width + 4]).toBe(0);
    // Subject untouched
    expect(contiguousErase[5 * width + 5]).toBe(255);
    // Isolated white island inside subject remains opaque in contiguous mode
    expect(contiguousErase[5 * width + 8]).toBe(255);

    const globalErase = applyMagicWandMask({
      srcRgba: rgba,
      alphaMask: initial,
      width,
      height,
      seedX: 1,
      seedY: 1,
      tolerance: 20,
      action: "erase",
      contiguous: false,
      feather: false,
    });

    // Isolated matching island is erased in global mode, subject stays intact
    expect(globalErase[5 * width + 8]).toBe(0);
    expect(globalErase[5 * width + 6]).toBe(255);
  });

  it("smart brush erases matching background while shielding contrasting subject edges inside brush radius", () => {
    const width = 16;
    const height = 10;
    const rgba = makeSplitImage(width, height);
    const initial = createInitialAlphaMask(rgba, width, height);

    // Stroke centered near boundary x=7 with radius 4: overlaps both x<8 (white bg) and x>=8 (red subject)
    const smartMask = applyBrushMask({
      srcRgba: rgba,
      alphaMask: initial,
      width,
      height,
      x0: 6,
      y0: 2,
      x1: 6,
      y1: 7,
      radius: 4,
      action: "erase",
      smart: true,
      tolerance: 25,
    });

    // Background pixels under stroke erased
    expect(smartMask[5 * width + 6]).toBe(0);
    // Contrasting subject pixels right at boundary (x=8, distance 2 <= radius 4) stay shielded
    expect(smartMask[5 * width + 8]).toBe(255);

    // Non-smart manual brush erases across the boundary indiscriminately
    const manualMask = applyBrushMask({
      srcRgba: rgba,
      alphaMask: initial,
      width,
      height,
      x0: 6,
      y0: 5,
      x1: 6,
      y1: 5,
      radius: 4,
      action: "erase",
      smart: false,
      tolerance: 25,
    });
    expect(manualMask[5 * width + 8]).toBeLessThan(128);

    // Restore brings erased pixels back cleanly
    const restored = applyBrushMask({
      srcRgba: rgba,
      alphaMask: manualMask,
      width,
      height,
      x0: 6,
      y0: 5,
      x1: 8,
      y1: 5,
      radius: 4,
      action: "restore",
      smart: false,
      tolerance: 25,
    });
    expect(restored[5 * width + 8]).toBe(255);
    expect(restored[5 * width + 6]).toBe(255);
  });

  it("inverts alpha masks and preserves originally transparent source PNG pixels", () => {
    const width = 4;
    const height = 2;
    const rgba = makeSplitImage(width, height);
    // Make pixel 0 inherently transparent in source photo
    rgba[3] = 0;

    const initial = createInitialAlphaMask(rgba, width, height);
    expect(initial[0]).toBe(0);

    const cutoutErasedLeft = applyMagicWandMask({
      srcRgba: rgba,
      alphaMask: initial,
      width,
      height,
      seedX: 1,
      seedY: 0,
      tolerance: 15,
      action: "erase",
      feather: false,
    });

    const inverted = invertAlphaMask(rgba, cutoutErasedLeft);
    // Source transparent pixel 0 stays 0, left erased pixels become 255, right kept pixels become 0
    expect(inverted[0]).toBe(0);
    expect(inverted[1]).toBe(255);
    expect(inverted[2]).toBe(0);

    const cutout = createCutoutFromMask({ width, height, rgba }, inverted);
    expect(cutout.foregroundRgba[0 * 4 + 3]).toBe(0);
    expect(cutout.foregroundRgba[1 * 4 + 3]).toBe(255);
    expect(cutout.foregroundRgba[2 * 4 + 3]).toBe(0);
  });
});
