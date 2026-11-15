"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AsciiControlsPanel } from "@/components/studio/AsciiControlsPanel";
import { AsciiExportPanel } from "@/components/studio/AsciiExportPanel";
import { AsciiPresetsHistoryPanel } from "@/components/studio/AsciiPresetsHistoryPanel";
import { AsciiPreviewCanvas } from "@/components/studio/AsciiPreviewCanvas";
import {
  exportAsciiAsHtml,
  exportAsciiAsMarkdown,
  exportAsciiAsPngBlob,
  exportAsciiAsSvg,
  exportAsciiAsTxt,
  sanitizeDownloadFilename,
} from "@/lib/ascii/exporters";
import { DEFAULT_ASCII_SETTINGS } from "@/lib/ascii/presets";
import {
  appendAsciiHistory,
  clearAsciiHistory,
  cloneAsciiSettings,
  deleteCustomPreset,
  loadAsciiHistory,
  loadHistoryPreference,
  loadSavedPresets,
  saveCustomPreset,
  saveHistoryPreference,
} from "@/lib/ascii/storage";
import type {
  AsciiConversionSettings,
  AsciiExportFormat,
  AsciiGridResult,
  AsciiHistoryEntry,
  SavedAsciiPreset,
} from "@/lib/ascii/types";
import { AsciiWorkerClient } from "@/lib/ascii/worker-client";
import type { DecodedImagePayload } from "@/lib/media/types";

interface AsciiStudioSectionProps {
  payload: DecodedImagePayload;
  bufferRevision: string;
  fileName: string;
  onRenderingChange?: (isRendering: boolean) => void;
}

function triggerBlobDownload(blob: Blob, downloadName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function formatByteSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function AsciiStudioSection({
  payload,
  bufferRevision,
  fileName,
  onRenderingChange,
}: AsciiStudioSectionProps) {
  const workerClientRef = useRef<AsciiWorkerClient | null>(null);
  const latestKeyRef = useRef<string>("");

  const [settings, setSettings] = useState<AsciiConversionSettings>(
    DEFAULT_ASCII_SETTINGS
  );
  const [settingsEpoch, setSettingsEpoch] = useState(0);
  const [exportWidthPx, setExportWidthPx] = useState(1400);

  const [renderState, setRenderState] = useState<{
    key: string;
    grid: AsciiGridResult;
  } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [savedPresets, setSavedPresets] = useState<SavedAsciiPreset[]>([]);
  const [history, setHistory] = useState<AsciiHistoryEntry[]>([]);
  const [historyEnabled, setHistoryEnabled] = useState(true);

  const [isExporting, setIsExporting] = useState<AsciiExportFormat | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSavedPresets(loadSavedPresets());
      setHistory(loadAsciiHistory());
      setHistoryEnabled(loadHistoryPreference());
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    return () => {
      workerClientRef.current?.dispose();
      workerClientRef.current = null;
    };
  }, []);

  const activeKey = useMemo(
    () => `${bufferRevision}::${JSON.stringify(settings)}`,
    [bufferRevision, settings]
  );

  const isRendering = renderState?.key !== activeKey;
  const activeGrid = renderState?.grid ?? null;

  useEffect(() => {
    onRenderingChange?.(isRendering);
  }, [isRendering, onRenderingChange]);

  useEffect(() => {
    latestKeyRef.current = activeKey;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!workerClientRef.current) {
        workerClientRef.current = new AsciiWorkerClient();
      }
      workerClientRef.current
        .render(payload.rgba, payload.width, payload.height, settings)
        .then((grid) => {
          if (cancelled || latestKeyRef.current !== activeKey) {
            return;
          }
          setRenderError(null);
          setRenderState({ key: activeKey, grid });
        })
        .catch((err) => {
          if (cancelled || latestKeyRef.current !== activeKey) {
            return;
          }
          setRenderError(
            err instanceof Error ? err.message : "ASCII render worker failed."
          );
        });
    }, 18);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeKey, payload.height, payload.rgba, payload.width, settings]);

  const handleReset = useCallback(() => {
    setSettings({ ...DEFAULT_ASCII_SETTINGS });
    setSettingsEpoch((prev) => prev + 1);
  }, []);

  const handleApplySettings = useCallback((next: AsciiConversionSettings) => {
    setSettings(cloneAsciiSettings(next));
    setSettingsEpoch((prev) => prev + 1);
  }, []);

  const handleSavePreset = useCallback(
    (name: string) => {
      const updated = saveCustomPreset(name, settings);
      setSavedPresets(updated);
    },
    [settings]
  );

  const handleDeletePreset = useCallback((id: string) => {
    const updated = deleteCustomPreset(id);
    setSavedPresets(updated);
  }, []);

  const handleToggleHistoryEnabled = useCallback((enabled: boolean) => {
    saveHistoryPreference(enabled);
    setHistoryEnabled(enabled);
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory(clearAsciiHistory());
  }, []);

  const handleExport = useCallback(
    async (format: AsciiExportFormat) => {
      if (!activeGrid) {
        return;
      }

      setIsExporting(format);
      setExportNotice(null);

      try {
        const baseName = sanitizeDownloadFilename(fileName, "dottoh-ascii");
        const exportConfig = {
          targetWidthPx: exportWidthPx,
          fontSizePx: settings.fontSizePx,
          characterSpacingPx: settings.characterSpacingPx,
        };

        let blob: Blob;
        let outName: string;

        switch (format) {
          case "png": {
            blob = await exportAsciiAsPngBlob(activeGrid, exportConfig);
            outName = `${baseName}-ascii.png`;
            break;
          }
          case "txt": {
            const text = exportAsciiAsTxt(activeGrid);
            blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            outName = `${baseName}-ascii.txt`;
            break;
          }
          case "md": {
            const md = exportAsciiAsMarkdown(activeGrid, fileName);
            blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
            outName = `${baseName}-ascii.md`;
            break;
          }
          case "svg": {
            const svg = exportAsciiAsSvg(activeGrid, exportConfig);
            blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
            outName = `${baseName}-ascii.svg`;
            break;
          }
          case "html": {
            const html = exportAsciiAsHtml(activeGrid, fileName, exportConfig);
            blob = new Blob([html], { type: "text/html;charset=utf-8" });
            outName = `${baseName}-ascii.html`;
            break;
          }
        }

        triggerBlobDownload(blob, outName);

        if (historyEnabled) {
          const nextHistory = appendAsciiHistory({
            fileName,
            format: format.toUpperCase(),
            columns: activeGrid.columns,
            rows: activeGrid.rows,
            lines: activeGrid.lines,
            settings,
          });
          setHistory(nextHistory);
        }

        setExportNotice(
          `DOWNLOADED ${outName} (${formatByteSize(blob.size)})`
        );
      } catch (err) {
        setExportNotice(
          err instanceof Error ? err.message : "Export generation failed."
        );
      } finally {
        setIsExporting(null);
      }
    },
    [
      activeGrid,
      exportWidthPx,
      fileName,
      historyEnabled,
      settings,
    ]
  );

  return (
    <div className="space-y-6">
      {renderError && (
        <div
          role="alert"
          className="border border-[#d71921] bg-[#ffffff] px-4 py-3 font-mono text-xs text-[#d71921]"
        >
          {renderError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <AsciiPreviewCanvas
            grid={activeGrid}
            settings={settings}
            isRendering={isRendering}
            fileName={fileName}
            exportWidthPx={exportWidthPx}
          />

          <AsciiExportPanel
            grid={activeGrid}
            settings={settings}
            exportWidthPx={exportWidthPx}
            onChangeExportWidthPx={setExportWidthPx}
            onExport={handleExport}
            isExporting={isExporting}
            exportNotice={exportNotice}
          />
        </div>

        <div className="space-y-6 lg:col-span-5">
          <AsciiControlsPanel
            settings={settings}
            settingsEpoch={settingsEpoch}
            onChange={setSettings}
            onReset={handleReset}
          />

          <AsciiPresetsHistoryPanel
            savedPresets={savedPresets}
            history={history}
            historyEnabled={historyEnabled}
            onSavePreset={handleSavePreset}
            onApplyPreset={handleApplySettings}
            onDeletePreset={handleDeletePreset}
            onToggleHistoryEnabled={handleToggleHistoryEnabled}
            onClearHistory={handleClearHistory}
            onApplyHistoryEntry={(entry) => handleApplySettings(entry.settings)}
          />
        </div>
      </div>
    </div>
  );
}
