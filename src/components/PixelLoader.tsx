interface PixelLoaderProps {
  size?: "sm" | "md";
  label?: string;
}

const CELL_DELAYS_MS = [0, 90, 180, 270, 360, 450, 540, 630, 720] as const;

export function PixelLoader({ size = "sm", label }: PixelLoaderProps) {
  const cellSize = size === "md" ? "h-2 w-2" : "h-1.5 w-1.5";
  const gapSize = size === "md" ? "gap-1" : "gap-[3px]";

  return (
    <span
      role="status"
      aria-label={label ?? "Loading"}
      className="inline-flex items-center gap-2.5"
    >
      <span
        aria-hidden="true"
        className={`grid grid-cols-3 ${gapSize}`}
      >
        {CELL_DELAYS_MS.map((delayMs, index) => (
          <span
            key={delayMs}
            style={{ animationDelay: `${delayMs}ms` }}
            className={`dottoh-pixel-pulse block ${cellSize} ${
              index === 4 ? "bg-[#d71921]" : "bg-[#000000]"
            }`}
          />
        ))}
      </span>
      {label && (
        <span className="font-mono text-xs text-[#525252]">{label}</span>
      )}
    </span>
  );
}
