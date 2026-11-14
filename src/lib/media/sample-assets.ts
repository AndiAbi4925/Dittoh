export type ProceduralSampleVariant = "sphere" | "monolith";

/**
 * Generates an in-memory geometric PNG File on an HTML5 Canvas for instant testing
 * without relying on external assets or AI-generated imagery.
 */
export async function createGeometricSampleFile(
  variant: ProceduralSampleVariant
): Promise<File> {
  const width = 480;
  const height = 480;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas for sample generation.");
  }

  ctx.fillStyle = "#f4f4f4";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#d9d9d9";
  ctx.lineWidth = 1;
  for (let i = 24; i < width; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  if (variant === "sphere") {
    const grad = ctx.createRadialGradient(200, 185, 22, 240, 240, 150);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.28, "#8c8c8c");
    grad.addColorStop(0.7, "#1f1f1f");
    grad.addColorStop(1, "#000000");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(240, 240, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d71921";
    ctx.fillRect(298, 174, 22, 22);
  } else {
    ctx.fillStyle = "#111111";
    ctx.fillRect(156, 80, 168, 320);

    const panelGrad = ctx.createLinearGradient(156, 80, 324, 400);
    panelGrad.addColorStop(0, "#404040");
    panelGrad.addColorStop(0.5, "#1a1a1a");
    panelGrad.addColorStop(1, "#000000");
    ctx.fillStyle = panelGrad;
    ctx.fillRect(172, 96, 136, 288);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(194, 122, 92, 16);
    ctx.fillStyle = "#b1b3b3";
    ctx.fillRect(194, 152, 64, 8);

    ctx.fillStyle = "#d71921";
    ctx.fillRect(262, 344, 24, 24);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Canvas PNG encoding failed."));
      }
    }, "image/png");
  });

  canvas.width = 0;
  canvas.height = 0;

  return new File([blob], `dottoh-sample-${variant}.png`, {
    type: "image/png",
  });
}
