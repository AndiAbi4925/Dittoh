import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  DEFAULT_ENABLED_RAW_FORMATS,
  DEFAULT_MAX_IMAGE_SIZE_MB,
  SUPPORTED_EXPORT_FORMATS,
} from "@/lib/constants";

describe("foundation constants", () => {
  it("defines expected MVP defaults and supported formats", () => {
    expect(APP_NAME).toBe("Dottoh");
    expect(DEFAULT_MAX_IMAGE_SIZE_MB).toBe(50);
    expect(DEFAULT_ENABLED_RAW_FORMATS).toContain("arw");
    expect(SUPPORTED_EXPORT_FORMATS).toEqual(["png", "txt", "md", "svg", "html"]);
  });
});

