import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  DEFAULT_ENABLED_RAW_FORMATS,
  DEFAULT_MAX_IMAGE_SIZE_MB,
  SUPPORTED_EXPORT_FORMATS,
  SUPPORTED_RASTER_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from "@/lib/constants";

describe("foundation constants", () => {
  it("defines expected MVP defaults and supported formats", () => {
    expect(APP_NAME).toBe("Dottoh");
    expect(DEFAULT_MAX_IMAGE_SIZE_MB).toBe(50);
    expect(SUPPORTED_RASTER_EXTENSIONS).toEqual([
      "png",
      "jpg",
      "jpeg",
      "webp",
      "heic",
      "heif",
    ]);
    expect(DEFAULT_ENABLED_RAW_FORMATS).toEqual([
      "arw",
      "dng",
      "cr2",
      "cr3",
      "nef",
      "raf",
    ]);
    expect(SUPPORTED_EXPORT_FORMATS).toEqual(["png", "txt", "md", "svg", "html"]);
    expect(SUPPORTED_VIDEO_EXTENSIONS).toEqual(["mp4", "mov", "gif"]);
  });
});

