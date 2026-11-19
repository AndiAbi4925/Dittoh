export interface OriginRectLike {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const PIXEL_GRID_PX = 8;
const WIPE_STEPS = 12;

function snapToGrid(value: number): number {
  if (value <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(value / PIXEL_GRID_PX) * PIXEL_GRID_PX);
}

/**
 * Generates ease-out, 8px-quantized inset clip-path keyframes expanding
 * a sharp 2px-radius square out of the theme toggle button across the viewport.
 */
export function buildPixelSquareWipeFrames(
  originRect: OriginRectLike,
  viewportWidth: number,
  viewportHeight: number
): Keyframe[] {
  const safeW = Math.max(1, viewportWidth);
  const safeH = Math.max(1, viewportHeight);

  const startTop = Math.max(0, Math.min(safeH, originRect.top));
  const startLeft = Math.max(0, Math.min(safeW, originRect.left));
  const startRight = Math.max(0, Math.min(safeW, safeW - originRect.right));
  const startBottom = Math.max(0, Math.min(safeH, safeH - originRect.bottom));

  const frames: Keyframe[] = [];

  for (let i = 0; i <= WIPE_STEPS; i += 1) {
    if (i === WIPE_STEPS) {
      frames.push({
        clipPath: "inset(0px 0px 0px 0px round 0px)",
      });
      continue;
    }

    const progress = i / WIPE_STEPS;
    const eased = 1 - Math.pow(1 - progress, 3);
    const remain = 1 - eased;

    const top = snapToGrid(startTop * remain);
    const right = snapToGrid(startRight * remain);
    const bottom = snapToGrid(startBottom * remain);
    const left = snapToGrid(startLeft * remain);

    frames.push({
      clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 2px)`,
    });
  }

  return frames;
}
