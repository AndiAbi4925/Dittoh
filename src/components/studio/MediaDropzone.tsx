"use client";

import { useRef, useState } from "react";
import { IconCloseCross, IconUploadGrid } from "@/components/BrandMark";
import { SUPPORTED_RASTER_EXTENSIONS } from "@/lib/constants";
import { formatKindBadge } from "@/lib/media/local-processor";
import type { ProceduralSampleVariant } from "@/lib/media/sample-assets";
import type { DecodedImagePayload } from "@/lib/media/types";
import { buildAcceptAttribute } from "@/lib/media/validation";

interface MediaDropzoneProps {
  maxImageSizeMb: number;
  enabledRawFormats: readonly string[];
  disabled?: boolean;
  fileName: string | null;
  fileSizeBytes: number | null;
  decoded: DecodedImagePayload | null;
  onFileSelected: (file: File) => void;
  onSampleSelected: (variant: ProceduralSampleVariant) => void;
  onClear: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function MediaDropzone({
  maxImageSizeMb,
  enabledRawFormats,
  disabled = false,
  fileName,
  fileSizeBytes,
  decoded,
  onFileSelected,
  onSampleSelected,
  onClear,
}: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptValue = buildAcceptAttribute(enabledRawFormats);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || disabled) {
      return;
    }
    onFileSelected(file);
  };

  if (decoded && fileName) {
    return (
      <div className="border border-[#000000] bg-[#ffffff] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#525252]">
              <span className="inline-block h-2 w-2 bg-[#d71921]" aria-hidden="true" />
              <span>{formatKindBadge(decoded.kind)}</span>
              <span>/</span>
              <span>.{decoded.format.toUpperCase()}</span>
              {fileSizeBytes !== null && (
                <>
                  <span>/</span>
                  <span>{formatFileSize(fileSizeBytes)}</span>
                </>
              )}
            </div>
            <p className="mt-1.5 truncate font-mono text-sm font-medium text-[#000000]">
              {fileName}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-[#525252]">
              <span>
                WORKING GRID SOURCE: {decoded.width} x {decoded.height} PX
              </span>
              {decoded.wasDownsampled && (
                <span className="text-[#d71921]">
                  DOWNSAMPLED FROM {decoded.originalWidth} x {decoded.originalHeight} PX FOR BROWSER MEMORY SAFETY
                </span>
              )}
              {decoded.cameraModel && <span>SENSOR: {decoded.cameraModel}</span>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="dottoh-btn border border-[#000000] bg-[#ffffff] px-3.5 py-2 text-[#000000] hover:bg-[#000000] hover:text-[#ffffff] disabled:opacity-50"
            >
              REPLACE FILE
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              aria-label="Clear active file"
              className="dottoh-btn border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 text-[#000000] hover:border-[#d71921] hover:text-[#d71921] disabled:opacity-50"
            >
              <IconCloseCross className="h-4 w-4" />
              <span>CLEAR</span>
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={acceptValue}
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
          aria-label="Replace image or RAW file"
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`border border-dashed p-6 transition-colors sm:p-8 ${
        isDragging
          ? "border-[#d71921] bg-[#f4f4f4]"
          : "border-[#000000] bg-[#ffffff]"
      }`}
    >
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 border border-[#b1b3b3] bg-[#f4f4f4] px-2.5 py-1 font-mono text-[11px] uppercase text-[#000000]">
            <IconUploadGrid className="h-4 w-4" />
            <span>LOCAL WORKER INPUT STAGE / MAX {maxImageSizeMb} MB</span>
          </div>

          <h3 className="mt-4 font-display text-2xl text-[#000000]">
            DROP AN IMAGE OR CAMERA RAW FILE.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#525252]">
            Decoding runs entirely on your device using browser APIs and
            self-hosted WebAssembly. Files never leave your browser.
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[11px] uppercase">
            {SUPPORTED_RASTER_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="border border-[#b1b3b3] bg-[#f4f4f4] px-2 py-0.5 text-[#000000]"
              >
                .{ext}
              </span>
            ))}
            {enabledRawFormats.map((ext) => (
              <span
                key={ext}
                className="border border-[#000000] bg-[#000000] px-2 py-0.5 text-[#ffffff]"
              >
                .{ext} RAW
              </span>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 lg:w-64">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="dottoh-btn w-full border border-[#000000] bg-[#000000] px-4 py-3 text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-50"
          >
            <IconUploadGrid className="h-4 w-4" />
            <span>SELECT IMAGE FILE</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSampleSelected("sphere")}
              className="dottoh-btn border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 text-[11px] text-[#000000] hover:border-[#000000] disabled:opacity-50"
            >
              SAMPLE: SPHERE
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSampleSelected("monolith")}
              className="dottoh-btn border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 text-[11px] text-[#000000] hover:border-[#000000] disabled:opacity-50"
            >
              SAMPLE: MONOLITH
            </button>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptValue}
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        className="sr-only"
        aria-label="Upload image or RAW file for ASCII conversion"
      />
    </div>
  );
}
