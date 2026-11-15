import type { AsciiExportConfig, AsciiGridResult } from "@/lib/ascii/types";
import { normalizeHexColor } from "@/lib/media/colors";

const MAX_EXPORT_DIM_PX = 4096;
const MIN_EXPORT_DIM_PX = 240;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stripXmlControlChars(input: string): string {
  return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function escapeXmlText(input: string): string {
  return stripXmlControlChars(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeHtmlText(input: string): string {
  return escapeXmlText(input);
}

export function sanitizeDownloadFilename(
  rawName: string,
  fallback = "dottoh-ascii"
): string {
  const withoutExt = rawName.replace(/\.[^/.]+$/, "");
  const cleaned = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function resolveSafeExportConfig(
  grid: AsciiGridResult,
  partial?: Partial<AsciiExportConfig>
): AsciiExportConfig {
  const fontSizePx = clamp(Math.round(partial?.fontSizePx ?? 12), 6, 36);
  const characterSpacingPx = clamp(
    Math.round((partial?.characterSpacingPx ?? 0) * 10) / 10,
    0,
    16
  );
  const naturalAdvance = fontSizePx * 0.62 + characterSpacingPx;
  const naturalWidth = Math.round(grid.columns * naturalAdvance + fontSizePx * 2);
  const targetWidthPx = clamp(
    Math.round(partial?.targetWidthPx ?? naturalWidth),
    MIN_EXPORT_DIM_PX,
    MAX_EXPORT_DIM_PX
  );

  return {
    targetWidthPx,
    fontSizePx,
    characterSpacingPx,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface ColorRun {
  text: string;
  colorHex: string | null;
}

function extractRowColorRuns(grid: AsciiGridResult, row: number): ColorRun[] {
  const lineChars = Array.from(grid.lines[row] ?? "");
  const runs: ColorRun[] = [];
  let currentColor: string | null = null;
  let currentChars: string[] = [];

  for (let col = 0; col < grid.columns; col += 1) {
    const idx = (row * grid.columns + col) * 4;
    const alpha = grid.cellRgba[idx + 3] ?? 0;
    const ch = lineChars[col] ?? " ";

    const cellHex =
      alpha > 0
        ? rgbToHex(
            grid.cellRgba[idx] ?? 0,
            grid.cellRgba[idx + 1] ?? 0,
            grid.cellRgba[idx + 2] ?? 0
          )
        : null;

    const effectiveColor = ch === " " || cellHex === null ? null : cellHex;

    if (currentChars.length === 0) {
      currentColor = effectiveColor;
      currentChars.push(ch);
      continue;
    }

    if (effectiveColor === currentColor) {
      currentChars.push(ch);
    } else {
      runs.push({ text: currentChars.join(""), colorHex: currentColor });
      currentColor = effectiveColor;
      currentChars = [ch];
    }
  }

  if (currentChars.length > 0) {
    runs.push({ text: currentChars.join(""), colorHex: currentColor });
  }

  return runs;
}

export function exportAsciiAsTxt(grid: AsciiGridResult): string {
  return grid.lines.join("\n");
}

export function exportAsciiAsMarkdown(
  grid: AsciiGridResult,
  rawTitle?: string
): string {
  const body = grid.lines.join("\n");
  let maxBackticks = 2;
  const matches = body.match(/`+/g);
  if (matches) {
    for (const m of matches) {
      if (m.length > maxBackticks) {
        maxBackticks = m.length;
      }
    }
  }
  const fence = "`".repeat(maxBackticks + 1);
  const safeTitle = rawTitle
    ? stripXmlControlChars(rawTitle).replaceAll("`", "").trim().slice(0, 80)
    : "";
  const header = safeTitle ? `# ${safeTitle}\n\n` : "";
  return `${header}${fence}text\n${body}\n${fence}\n`;
}

export function computeGridMetrics(
  grid: AsciiGridResult,
  config: AsciiExportConfig
): {
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
  fontSizePx: number;
  cellAdvanceX: number;
  lineHeightPx: number;
} {
  const baseAdvance = config.fontSizePx * 0.62 + config.characterSpacingPx;
  const basePad = config.fontSizePx * 1.25;
  const baseWidth = Math.max(1, grid.columns * baseAdvance + basePad * 2);
  const scale = clamp(config.targetWidthPx / baseWidth, 0.25, 8);

  const fontSizePx = config.fontSizePx * scale;
  const cellAdvanceX = baseAdvance * scale;
  const lineHeightPx = fontSizePx * 1.18;
  const paddingX = basePad * scale;
  const paddingY = basePad * scale;
  const width = clamp(
    Math.round(grid.columns * cellAdvanceX + paddingX * 2),
    16,
    MAX_EXPORT_DIM_PX
  );
  const height = clamp(
    Math.round(grid.rows * lineHeightPx + paddingY * 2),
    16,
    MAX_EXPORT_DIM_PX
  );

  return {
    width,
    height,
    paddingX,
    paddingY,
    fontSizePx,
    cellAdvanceX,
    lineHeightPx,
  };
}

export function exportAsciiAsSvg(
  grid: AsciiGridResult,
  partialConfig?: Partial<AsciiExportConfig>
): string {
  const config = resolveSafeExportConfig(grid, partialConfig);
  const metrics = computeGridMetrics(grid, config);
  const bgHex = grid.backgroundColorHex
    ? normalizeHexColor(grid.backgroundColorHex)
    : null;
  const defaultFgHex = normalizeHexColor(grid.defaultForegroundHex) ?? "#000000";

  const rowsMarkup: string[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    const y = (metrics.paddingY + metrics.fontSizePx + row * metrics.lineHeightPx).toFixed(2);
    const runs = extractRowColorRuns(grid, row);
    let colOffset = 0;
    const tspans: string[] = [];

    for (const run of runs) {
      const charCount = Array.from(run.text).length;
      if (run.colorHex !== null) {
        const x = (metrics.paddingX + colOffset * metrics.cellAdvanceX).toFixed(2);
        const safeFill = normalizeHexColor(run.colorHex) ?? defaultFgHex;
        tspans.push(
          `<tspan x="${x}" y="${y}" fill="${safeFill}" xml:space="preserve">${escapeXmlText(
            run.text
          )}</tspan>`
        );
      }
      colOffset += charCount;
    }

    if (tspans.length > 0) {
      rowsMarkup.push(
        `<text x="${metrics.paddingX.toFixed(2)}" y="${y}" xml:space="preserve">${tspans.join(
          ""
        )}</text>`
      );
    }
  }

  const bgRect = bgHex
    ? `  <rect width="100%" height="100%" fill="${bgHex}" />\n`
    : "";
  const letterSpacingAttr =
    config.characterSpacingPx > 0
      ? ` letter-spacing="${(config.characterSpacingPx * (metrics.fontSizePx / config.fontSizePx)).toFixed(2)}px"`
      : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${metrics.width} ${metrics.height}" width="${metrics.width}" height="${metrics.height}" role="img" aria-label="Dottoh ASCII art export">`,
    bgRect +
      `  <g font-family="ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, Consolas, monospace" font-size="${metrics.fontSizePx.toFixed(
        2
      )}px"${letterSpacingAttr}>`,
    ...rowsMarkup.map((line) => `    ${line}`),
    "  </g>",
    "</svg>",
    "",
  ].join("\n");
}

export function exportAsciiAsHtml(
  grid: AsciiGridResult,
  rawTitle = "Dottoh ASCII Export",
  partialConfig?: Partial<AsciiExportConfig>
): string {
  const config = resolveSafeExportConfig(grid, partialConfig);
  const safeTitle = escapeHtmlText(stripXmlControlChars(rawTitle).slice(0, 80) || "Dottoh ASCII Export");
  const bgHex = grid.backgroundColorHex
    ? normalizeHexColor(grid.backgroundColorHex)
    : null;
  const pageBg = bgHex ?? "#ffffff";
  const preBg = bgHex ?? "transparent";
  const defaultFgHex = normalizeHexColor(grid.defaultForegroundHex) ?? "#000000";

  const renderedRows: string[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    const runs = extractRowColorRuns(grid, row);
    const spans = runs.map((run) => {
      const escaped = escapeHtmlText(run.text);
      if (run.colorHex === null) {
        return escaped;
      }
      const safeColor = normalizeHexColor(run.colorHex) ?? defaultFgHex;
      return `<span style="color:${safeColor}">${escaped}</span>`;
    });
    renderedRows.push(spans.join(""));
  }

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '  <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';" />',
    `  <title>${safeTitle}</title>`,
    "  <style>",
    "    * { box-sizing: border-box; }",
    `    body { margin: 0; padding: 24px; background: ${pageBg}; color: ${defaultFgHex}; font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Consolas, monospace; }`,
    `    main { max-width: ${config.targetWidthPx}px; margin: 0 auto; overflow-x: auto; }`,
    `    pre { margin: 0; padding: 16px; background: ${preBg}; font-size: ${config.fontSizePx}px; line-height: 1.18; letter-spacing: ${config.characterSpacingPx}px; white-space: pre; font-family: inherit; }`,
    "  </style>",
    "</head>",
    "<body>",
    "  <main>",
    `    <pre aria-label="${safeTitle}">${renderedRows.join("\n")}</pre>`,
    "  </main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tileSize = 12
): void {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#e6e6e6";
  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      if (((x / tileSize + y / tileSize) | 0) % 2 === 1) {
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }
}

export interface CanvasRenderOptions {
  targetWidthPx?: number;
  fontSizePx?: number;
  characterSpacingPx?: number;
  showCheckerboardOnTransparent?: boolean;
  pixelRatio?: number;
}

export function renderAsciiToCanvas(
  canvas: HTMLCanvasElement,
  grid: AsciiGridResult,
  options: CanvasRenderOptions = {}
): { width: number; height: number } {
  const config = resolveSafeExportConfig(grid, {
    targetWidthPx: options.targetWidthPx,
    fontSizePx: options.fontSizePx,
    characterSpacingPx: options.characterSpacingPx,
  });
  const metrics = computeGridMetrics(grid, config);
  const dpr = clamp(options.pixelRatio ?? 1, 1, 2);

  canvas.width = Math.min(MAX_EXPORT_DIM_PX, Math.round(metrics.width * dpr));
  canvas.height = Math.min(MAX_EXPORT_DIM_PX, Math.round(metrics.height * dpr));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is unavailable.");
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, metrics.width, metrics.height);

  if (grid.backgroundColorHex) {
    ctx.fillStyle = normalizeHexColor(grid.backgroundColorHex) ?? "#ffffff";
    ctx.fillRect(0, 0, metrics.width, metrics.height);
  } else if (options.showCheckerboardOnTransparent) {
    drawCheckerboard(ctx, metrics.width, metrics.height, 10);
  }

  ctx.font = `${metrics.fontSizePx.toFixed(2)}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.textBaseline = "top";

  for (let row = 0; row < grid.rows; row += 1) {
    const y = metrics.paddingY + row * metrics.lineHeightPx;
    const lineChars = Array.from(grid.lines[row] ?? "");

    for (let col = 0; col < grid.columns; col += 1) {
      const ch = lineChars[col] ?? " ";
      if (ch === " ") {
        continue;
      }
      const idx = (row * grid.columns + col) * 4;
      const alpha = grid.cellRgba[idx + 3] ?? 0;
      if (alpha === 0) {
        continue;
      }

      const r = grid.cellRgba[idx] ?? 0;
      const g = grid.cellRgba[idx + 1] ?? 0;
      const b = grid.cellRgba[idx + 2] ?? 0;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillText(ch, metrics.paddingX + col * metrics.cellAdvanceX, y);
    }
  }

  ctx.restore();
  return { width: metrics.width, height: metrics.height };
}

export async function exportAsciiAsPngBlob(
  grid: AsciiGridResult,
  partialConfig?: Partial<AsciiExportConfig>
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderAsciiToCanvas(canvas, grid, {
    targetWidthPx: partialConfig?.targetWidthPx,
    fontSizePx: partialConfig?.fontSizePx,
    characterSpacingPx: partialConfig?.characterSpacingPx,
    showCheckerboardOnTransparent: false,
    pixelRatio: 1,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) {
        reject(new Error("Browser failed to encode ASCII PNG export."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
