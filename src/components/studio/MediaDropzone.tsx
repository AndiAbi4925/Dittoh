"use client";

import { useRef, useState } from "react";
import { IconCloseCross, IconUploadGrid } from "@/components/BrandMark";
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
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <div className="border border-[#d4d4d4] bg-[#ffffff] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#525252]">
              <span className="inline-block h-2 w-2 bg-[#d71921]" aria-hidden="true" />
              <span>{decoded.format.toUpperCase()}</span>
              {fileSizeBytes !== null && <span>{formatFileSize(fileSizeBytes)}</span>}
              <span>
                {decoded.width} x {decoded.height} px
              </span>
              {decoded.cameraModel && <span>{decoded.cameraModel}</span>}
            </div>
            <p className="mt-1.5 truncate font-sans text-base font-medium text-[#000000]">
              {fileName}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-4 py-2.5 text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4] disabled:opacity-50"
            >
              Change Photo
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              aria-label="Remove selected photo"
              className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3.5 py-2.5 text-[#000000] hover:border-[#d71921] hover:text-[#d71921] disabled:opacity-50"
            >
              <IconCloseCross className="h-4 w-4" />
              <span>Remove</span>
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
          aria-label="Choose a different photo"
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label="Choose or drop a photo"
      onClick={() => {
        if (!disabled) {
          inputRef.current?.click();
        }
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
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
      className={`border border-dashed px-6 py-12 text-center transition-colors sm:px-10 sm:py-16 ${
        isDragging
          ? "border-[#d71921] bg-[#f4f4f4]"
          : "border-[#000000] bg-[#ffffff] hover:bg-[#fafafa]"
      } ${disabled ? "cursor-wait opacity-70" : "cursor-pointer"}`}
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        <IconUploadGrid className="h-9 w-9 text-[#000000]" />

        <h2 className="mt-5 font-display text-2xl text-[#000000] sm:text-3xl">
          Drop your photo here
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-[#525252]">
          Supports PNG, JPG, JPEG, WebP, HEIC, HEIF, and camera RAW files up to{" "}
          {maxImageSizeMb} MB. Your photo stays on your device.
        </p>

        <div
          className="mt-7 flex w-full flex-col items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="dottoh-btn w-full border border-[#000000] bg-[#000000] px-8 py-4 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-50 sm:w-auto"
          >
            Choose Photo
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#525252]">
            <span>Or try a sample:</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSampleSelected("sphere")}
              className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#000000] disabled:opacity-50"
            >
              Sphere
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSampleSelected("monolith")}
              className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#000000] disabled:opacity-50"
            >
              Monolith
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
        aria-label="Upload photo file"
      />
    </div>
  );
}
