import * as UTIF from "utif";
import { MediaProcessingError } from "@/lib/media/types";

export interface RawTiffBitmap {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export function decodeTiffBuffer(buffer: ArrayBuffer): RawTiffBitmap {
  const ifds = UTIF.decode(buffer);
  const primary = ifds[0];

  if (!primary) {
    throw new MediaProcessingError(
      "DECODE_FAILED",
      "TIFF file does not contain a readable image directory."
    );
  }

  UTIF.decodeImage(buffer, primary);
  if (!primary.width || !primary.height || primary.width <= 0 || primary.height <= 0) {
    throw new MediaProcessingError(
      "DECODE_FAILED",
      "TIFF image dimensions could not be decoded."
    );
  }

  const rgbaBytes = UTIF.toRGBA8(primary);
  return {
    width: primary.width,
    height: primary.height,
    rgba: new Uint8ClampedArray(rgbaBytes),
  };
}
