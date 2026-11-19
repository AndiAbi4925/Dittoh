"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { IconCloseCross } from "@/components/BrandMark";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onCancel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[2px] border border-[#000000] bg-[#ffffff] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#e5e5e5] pb-3.5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#d71921]">
                  Confirm action
                </p>
                <h2
                  id={titleId}
                  className="mt-1 font-display text-xl text-[#000000]"
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close confirmation dialog"
                className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] p-1.5 text-[#000000] hover:border-[#000000]"
              >
                <IconCloseCross className="h-3.5 w-3.5" />
              </button>
            </div>

            <p
              id={descriptionId}
              className="mt-4 text-sm leading-relaxed text-[#525252]"
            >
              {description}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={onCancel}
                className="dittoh-btn min-h-[42px] border border-[#d4d4d4] bg-[#ffffff] px-4 py-2.5 text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`dittoh-btn min-h-[42px] border px-5 py-2.5 text-xs ${
                  destructive
                    ? "border-[#d71921] bg-[#d71921] text-[#ffffff] hover:border-[#000000] hover:bg-[#000000]"
                    : "border-[#000000] bg-[#000000] text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
