import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTACT_EMAIL,
  getContactEmail,
  SITE_MENU_ITEMS,
  SITE_NAV_ITEMS,
} from "@/lib/site-config";

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "generated") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

describe("UI shell configuration and negative design constraints", () => {
  it("resolves default and overridden contact email", () => {
    const previous = process.env.ADMIN_CONTACT_EMAIL;
    delete process.env.ADMIN_CONTACT_EMAIL;
    expect(getContactEmail()).toBe(DEFAULT_CONTACT_EMAIL);

    process.env.ADMIN_CONTACT_EMAIL = "legal@dottoh.app";
    expect(getContactEmail()).toBe("legal@dottoh.app");

    if (previous === undefined) {
      delete process.env.ADMIN_CONTACT_EMAIL;
    } else {
      process.env.ADMIN_CONTACT_EMAIL = previous;
    }
  });

  it("exposes unique primary navigation routes and excludes privacy/terms clutter from the navbar", () => {
    const hrefs = SITE_NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual(["/", "/convert", "/guide"]);
    expect(hrefs).not.toContain("/privacy");
    expect(hrefs).not.toContain("/terms");

    const menuHrefs = SITE_MENU_ITEMS.map((item) => item.href);
    expect(menuHrefs).toContain("/video");
    expect(menuHrefs).toContain("/convert/photo");
  });

  it("excludes Admin and GitHub links from public SiteFooter", () => {
    const footerPath = path.resolve(
      import.meta.dirname,
      "../src/components/SiteFooter.tsx"
    );
    const footer = fs.readFileSync(footerPath, "utf8");
    expect(footer).not.toContain('href="/admin"');
    expect(footer).not.toContain("GitHub");
  });

  it("forbids pill styling (rounded-full), em dashes, emojis, and banned animation libraries across src", () => {
    const srcRoot = path.resolve(import.meta.dirname, "../src");
    const files = collectSourceFiles(srcRoot);
    const emojiPattern = /\p{Extended_Pictographic}/u;
    const disallowedLibPattern = /(animejs|scrollreveal|popmotion|@splinetool)/i;

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const disallowedPillClass = ["rounded", "full"].join("-");
      expect(content, `${disallowedPillClass} found in ${file}`).not.toContain(
        disallowedPillClass
      );
      expect(content, `em/en dash found in ${file}`).not.toMatch(
        /[\u2014\u2013]/
      );
      expect(content, `emoji found in ${file}`).not.toMatch(emojiPattern);
      expect(content, `disallowed library found in ${file}`).not.toMatch(
        disallowedLibPattern
      );
    }
  });

  it("ships a valid Nothing-palette geometric SVG favicon", () => {
    const iconPath = path.resolve(import.meta.dirname, "../src/app/icon.svg");
    const svg = fs.readFileSync(iconPath, "utf8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("#000000");
    expect(svg).toContain("#ffffff");
    expect(svg).toContain("#d71921");
  });
});
