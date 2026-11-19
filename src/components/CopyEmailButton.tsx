"use client";

import { useState } from "react";
import { IconCopy } from "@/components/BrandMark";

export function CopyEmailButton({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setStatus("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          void handleCopy();
        }}
        className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
      >
        <IconCopy className="h-3 w-3" />
        <span>
          {status === "copied"
            ? "Copied"
            : status === "error"
              ? "Copy failed"
              : "Copy email"}
        </span>
      </button>
    </span>
  );
}
