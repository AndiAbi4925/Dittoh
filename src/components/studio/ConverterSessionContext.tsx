"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { reportStudioTelemetry } from "@/lib/ascii/telemetry-client";
import type {
  AsciiConversionSettings,
  AsciiExportFormat,
  AsciiGridResult,
  AsciiHistoryEntry,
  SavedAsciiPreset,
} from "@/lib/ascii/types";
import { AsciiWorkerClient } from "@/lib/ascii/worker-client";
import {
  DEFAULT_ENABLED_RAW_FORMATS,
  DEFAULT_MAX_IMAGE_SIZE_MB,
} from "@/lib/constants";
import { compositeRgbaBackground } from "@/lib/media/colors";
import { LocalWorkerProcessor } from "@/lib/media/local-processor";
import {
  createGeometricSampleFile,
  type ProceduralSampleVariant,
} from "@/lib/media/sample-assets";
import {
  type BackgroundFillOption,
  type BackgroundRemovalResult,
  type DecodedImagePayload,
  MediaProcessingError,
  type ProcessingProgress,
} from "@/lib/media/types";

const INITIAL_FILL: BackgroundFillOption = {
  mode: "transparent",
  customHex: "#000000",
};

const IDLE_PROGRESS: ProcessingProgress = {
  stage: "IDLE",
  progress: 0,
  message: "Waiting for a photo.",
};

function formatProgressLabel(progress: ProcessingProgress): string {
  switch (progress.stage) {
    case "VALIDATING_FILE":
      return "Checking file...";
    case "DECODING_IMAGE":
      return "Opening photo...";
    case "DECODING_RAW":
      return "Reading camera RAW photo...";
    case "LOADING_ONNX_MODEL":
      return "Loading background tool...";
    case "REMOVING_BACKGROUND":
      return "Removing background...";
    case "READY":
      return "Ready";
    case "ERROR":
      return "Could not process photo";
    default:
      return progress.message || "Working...";
  }
}

function formatByteSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
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

interface ConverterSessionContextValue {
  maxImageSizeMb: number;
  enabledRawFormats: readonly string[];
  fileName: string | null;
  fileSizeBytes: number | null;
  decoded: DecodedImagePayload | null;
  cutout: BackgroundRemovalResult | null;
  useCutout: boolean;
  fill: BackgroundFillOption;
  progress: ProcessingProgress;
  progressLabel: string;
  isBusy: boolean;
  errorMessage: string | null;
  activeBufferPayload: DecodedImagePayload | null;

  settings: AsciiConversionSettings;
  settingsEpoch: number;
  exportWidthPx: number;
  activeGrid: AsciiGridResult | null;
  isRendering: boolean;
  renderError: string | null;

  savedPresets: SavedAsciiPreset[];
  history: AsciiHistoryEntry[];
  historyEnabled: boolean;
  isExporting: AsciiExportFormat | null;
  exportNotice: string | null;

  handleFileSelected: (file: File) => Promise<void>;
  handleSampleSelected: (variant: ProceduralSampleVariant) => Promise<void>;
  handleRunCutout: () => Promise<void>;
  applyManualCutout: (result: BackgroundRemovalResult) => void;
  setUseCutout: (enabled: boolean) => void;
  setFill: (next: BackgroundFillOption) => void;
  resetCutout: () => void;
  handleCancel: () => void;
  handleClear: () => void;
  dismissError: () => void;

  setSettings: (next: AsciiConversionSettings) => void;
  resetSettings: () => void;
  applySettings: (next: AsciiConversionSettings) => void;
  setExportWidthPx: (widthPx: number) => void;
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
  toggleHistoryEnabled: (enabled: boolean) => void;
  clearHistory: () => void;
  handleExport: (format: AsciiExportFormat) => Promise<void>;
}

const ConverterSessionContext =
  createContext<ConverterSessionContextValue | null>(null);

interface ConverterSessionProviderProps {
  maxImageSizeMb?: number;
  enabledRawFormats?: readonly string[];
  children: React.ReactNode;
}

export function ConverterSessionProvider({
  maxImageSizeMb = DEFAULT_MAX_IMAGE_SIZE_MB,
  enabledRawFormats = DEFAULT_ENABLED_RAW_FORMATS,
  children,
}: ConverterSessionProviderProps) {
  const processorRef = useRef<LocalWorkerProcessor | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const workerClientRef = useRef<AsciiWorkerClient | null>(null);
  const latestKeyRef = useRef<string>("");

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [decoded, setDecoded] = useState<DecodedImagePayload | null>(null);
  const [cutout, setCutout] = useState<BackgroundRemovalResult | null>(null);
  const [useCutout, setUseCutout] = useState(false);
  const [fill, setFill] = useState<BackgroundFillOption>(INITIAL_FILL);
  const [progress, setProgress] = useState<ProcessingProgress>(IDLE_PROGRESS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [decodeEpoch, setDecodeEpoch] = useState(0);

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
      abortRef.current?.abort();
      processorRef.current?.dispose();
      workerClientRef.current?.dispose();
      workerClientRef.current = null;
    };
  }, []);

  const getProcessor = (): LocalWorkerProcessor => {
    if (!processorRef.current) {
      processorRef.current = new LocalWorkerProcessor();
    }
    return processorRef.current;
  };

  const isBusy =
    progress.stage !== "IDLE" &&
    progress.stage !== "READY" &&
    progress.stage !== "ERROR";

  const activeBufferPayload = useMemo<DecodedImagePayload | null>(() => {
    if (!decoded) {
      return null;
    }
    if (useCutout && cutout) {
      return {
        ...decoded,
        rgba: compositeRgbaBackground(cutout.foregroundRgba, fill),
      };
    }
    return decoded;
  }, [cutout, decoded, fill, useCutout]);

  const bufferRevision = useMemo(
    () =>
      `${decodeEpoch}:${useCutout && cutout ? `cutout:${fill.mode}:${fill.customHex}` : "raw"}`,
    [cutout, decodeEpoch, fill.customHex, fill.mode, useCutout]
  );

  const activeKey = useMemo(
    () =>
      activeBufferPayload
        ? `${bufferRevision}::${JSON.stringify(settings)}`
        : "",
    [activeBufferPayload, bufferRevision, settings]
  );

  const isRendering = Boolean(activeBufferPayload) && renderState?.key !== activeKey;
  const activeGrid = activeBufferPayload ? (renderState?.grid ?? null) : null;

  useEffect(() => {
    if (!activeBufferPayload || !activeKey) {
      return;
    }

    latestKeyRef.current = activeKey;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!workerClientRef.current) {
        workerClientRef.current = new AsciiWorkerClient();
      }
      workerClientRef.current
        .render(
          activeBufferPayload.rgba,
          activeBufferPayload.width,
          activeBufferPayload.height,
          settings
        )
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
            err instanceof Error ? err.message : "Could not render preview."
          );
        });
    }, 18);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeBufferPayload, activeKey, settings]);

  const handleFileSelected = useCallback(
    async (file: File) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setErrorMessage(null);
      setExportNotice(null);
      setCutout(null);
      setUseCutout(false);
      setFill(INITIAL_FILL);
      setFileName(file.name);
      setFileSizeBytes(file.size);

      try {
        const result = await getProcessor().decodeFile(
          file,
          { maxImageSizeMb, enabledRawFormats },
          {
            signal: controller.signal,
            onProgress: (next) => setProgress(next),
          }
        );

        if (!controller.signal.aborted) {
          setDecoded(result);
          setDecodeEpoch((prev) => prev + 1);
          reportStudioTelemetry({
            eventType: "conversion",
            inputFormat: result.format.toLowerCase(),
          });
        }
      } catch (error) {
        if (
          error instanceof MediaProcessingError &&
          error.code === "CANCELLED"
        ) {
          setProgress(IDLE_PROGRESS);
          return;
        }
        setDecoded(null);
        setFileName(null);
        setFileSizeBytes(null);
        const message =
          error instanceof Error ? error.message : "Could not open that photo.";
        setErrorMessage(message);
        setProgress({
          stage: "ERROR",
          progress: 0,
          message,
        });
      }
    },
    [enabledRawFormats, maxImageSizeMb]
  );

  const handleSampleSelected = useCallback(
    async (variant: ProceduralSampleVariant) => {
      try {
        setErrorMessage(null);
        const sampleFile = await createGeometricSampleFile(variant);
        await handleFileSelected(sampleFile);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not create the sample photo."
        );
      }
    },
    [handleFileSelected]
  );

  const handleRunCutout = useCallback(async () => {
    if (!decoded) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setErrorMessage(null);
    setProgress({
      stage: "LOADING_ONNX_MODEL",
      progress: 10,
      message: "Loading background tool...",
    });

    try {
      const result = await getProcessor().removeBackground(decoded, {
        signal: controller.signal,
        onProgress: (next) => setProgress(next),
      });
      if (!controller.signal.aborted) {
        setCutout(result);
        setUseCutout(true);
        reportStudioTelemetry({
          eventType: "bg_removal",
          inputFormat: decoded.format.toLowerCase(),
          durationMs: result.inferenceMs,
        });
      }
    } catch (error) {
      if (
        error instanceof MediaProcessingError &&
        error.code === "CANCELLED"
      ) {
        setProgress({
          stage: "READY",
          progress: 100,
          message: "Cancelled.",
        });
        return;
      }
      const message =
        error instanceof Error ? error.message : "Could not remove background.";
      setErrorMessage(message);
      setProgress({
        stage: "ERROR",
        progress: 0,
        message,
      });
    }
  }, [decoded]);

  const resetCutout = useCallback(() => {
    setCutout(null);
    setUseCutout(false);
    setFill(INITIAL_FILL);
  }, []);

  const applyManualCutout = useCallback((result: BackgroundRemovalResult) => {
    setCutout(result);
    setUseCutout(true);
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    if (!decoded) {
      setFileName(null);
      setFileSizeBytes(null);
      setProgress(IDLE_PROGRESS);
    }
  }, [decoded]);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    setDecoded(null);
    setCutout(null);
    setUseCutout(false);
    setFill(INITIAL_FILL);
    setFileName(null);
    setFileSizeBytes(null);
    setErrorMessage(null);
    setExportNotice(null);
    setRenderState(null);
    setRenderError(null);
    setProgress(IDLE_PROGRESS);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_ASCII_SETTINGS });
    setSettingsEpoch((prev) => prev + 1);
  }, []);

  const applySettings = useCallback((next: AsciiConversionSettings) => {
    setSettings(cloneAsciiSettings(next));
    setSettingsEpoch((prev) => prev + 1);
  }, []);

  const savePreset = useCallback(
    (name: string) => {
      setSavedPresets(saveCustomPreset(name, settings));
    },
    [settings]
  );

  const deletePreset = useCallback((id: string) => {
    setSavedPresets(deleteCustomPreset(id));
  }, []);

  const toggleHistoryEnabled = useCallback((enabled: boolean) => {
    saveHistoryPreference(enabled);
    setHistoryEnabled(enabled);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory(clearAsciiHistory());
  }, []);

  const handleExport = useCallback(
    async (format: AsciiExportFormat) => {
      if (!activeGrid || !activeBufferPayload) {
        return;
      }

      const activeFileName = fileName ?? "dittoh-image";
      setIsExporting(format);
      setExportNotice(null);

      try {
        const baseName = sanitizeDownloadFilename(activeFileName, "dittoh-ascii");
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
            const md = exportAsciiAsMarkdown(activeGrid, activeFileName);
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
            const html = exportAsciiAsHtml(activeGrid, activeFileName, exportConfig);
            blob = new Blob([html], { type: "text/html;charset=utf-8" });
            outName = `${baseName}-ascii.html`;
            break;
          }
        }

        triggerBlobDownload(blob, outName);

        if (historyEnabled) {
          const nextHistory = appendAsciiHistory({
            fileName: activeFileName,
            format: format.toUpperCase(),
            columns: activeGrid.columns,
            rows: activeGrid.rows,
            lines: activeGrid.lines,
            settings,
          });
          setHistory(nextHistory);
        }

        setExportNotice(`Saved ${outName} (${formatByteSize(blob.size)})`);
        reportStudioTelemetry({
          eventType: "export",
          inputFormat: activeBufferPayload.format.toLowerCase(),
          outputFormat: format,
          durationMs: activeGrid.renderMs,
        });
      } catch (err) {
        setExportNotice(
          err instanceof Error ? err.message : "Could not create that file."
        );
      } finally {
        setIsExporting(null);
      }
    },
    [
      activeBufferPayload,
      activeGrid,
      exportWidthPx,
      fileName,
      historyEnabled,
      settings,
    ]
  );

  const value = useMemo<ConverterSessionContextValue>(
    () => ({
      maxImageSizeMb,
      enabledRawFormats,
      fileName,
      fileSizeBytes,
      decoded,
      cutout,
      useCutout,
      fill,
      progress,
      progressLabel: formatProgressLabel(progress),
      isBusy,
      errorMessage,
      activeBufferPayload,
      settings,
      settingsEpoch,
      exportWidthPx,
      activeGrid,
      isRendering,
      renderError,
      savedPresets,
      history,
      historyEnabled,
      isExporting,
      exportNotice,
      handleFileSelected,
      handleSampleSelected,
      handleRunCutout,
      applyManualCutout,
      setUseCutout,
      setFill,
      resetCutout,
      handleCancel,
      handleClear,
      dismissError: () => setErrorMessage(null),
      setSettings,
      resetSettings,
      applySettings,
      setExportWidthPx,
      savePreset,
      deletePreset,
      toggleHistoryEnabled,
      clearHistory,
      handleExport,
    }),
    [
      activeBufferPayload,
      activeGrid,
      applyManualCutout,
      applySettings,
      clearHistory,
      cutout,
      decoded,
      deletePreset,
      enabledRawFormats,
      errorMessage,
      exportNotice,
      exportWidthPx,
      fileName,
      fileSizeBytes,
      fill,
      handleCancel,
      handleClear,
      handleExport,
      handleFileSelected,
      handleRunCutout,
      handleSampleSelected,
      history,
      historyEnabled,
      isBusy,
      isExporting,
      isRendering,
      maxImageSizeMb,
      progress,
      renderError,
      resetCutout,
      resetSettings,
      savePreset,
      savedPresets,
      settings,
      settingsEpoch,
      toggleHistoryEnabled,
      useCutout,
    ]
  );

  return (
    <ConverterSessionContext.Provider value={value}>
      {children}
    </ConverterSessionContext.Provider>
  );
}

export function useConverterSession(): ConverterSessionContextValue {
  const ctx = useContext(ConverterSessionContext);
  if (!ctx) {
    throw new Error(
      "useConverterSession must be used inside ConverterSessionProvider."
    );
  }
  return ctx;
}
