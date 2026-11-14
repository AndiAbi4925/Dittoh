import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { metadata as privacyMetadata } from "@/app/privacy/page";
import { metadata as termsMetadata } from "@/app/terms/page";

function readNormalized(relativePath: string): string {
  const fullPath = path.resolve(import.meta.dirname, "..", relativePath);
  return fs.readFileSync(fullPath, "utf8").replace(/\s+/g, " ");
}

describe("legal routes compliance", () => {
  it("exports metadata and documents Indonesia UU PDP No. 27/2022 on /privacy", () => {
    expect(privacyMetadata.title).toBe("Privacy Policy");
    const source = readNormalized("src/app/privacy/page.tsx");
    expect(source).toContain("UU No. 27 Tahun 2022");
    expect(source).toContain("localStorage");
    expect(source).toContain("AuditLog");
    expect(source.toLowerCase()).toContain("never transmitted");
  });

  it("exports metadata and documents Indonesian governing law on /terms", () => {
    expect(termsMetadata.title).toBe("Terms & Conditions");
    const source = readNormalized("src/app/terms/page.tsx");
    expect(source).toContain("Republic of Indonesia");
    expect(source).toContain("retain full ownership");
    expect(source).toContain("DEFAULT_MAX_IMAGE_SIZE_MB");
  });
});
