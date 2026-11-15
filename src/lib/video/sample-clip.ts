/**
 * Generates an uncompressed GIF89a animation of concentric Dottoh dot-matrix pulses
 * using pure TypeScript (valid 9-bit LZW blocks with periodic Clear codes),
 * avoiding external fixture files or AI-generated assets.
 */
export function createProceduralSampleGifBytes(options?: {
  width?: number;
  height?: number;
  frameCount?: number;
  delayCs?: number;
}): Uint8Array {
  const width = Math.max(32, Math.min(320, options?.width ?? 160));
  const height = Math.max(24, Math.min(240, options?.height ?? 90));
  const frameCount = Math.max(4, Math.min(60, options?.frameCount ?? 20));
  const delayCs = Math.max(4, Math.min(50, options?.delayCs ?? 10));

  const out: number[] = [];

  const pushAscii = (text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      out.push(text.charCodeAt(i));
    }
  };
  const pushU16 = (val: number) => {
    out.push(val & 0xff, (val >> 8) & 0xff);
  };

  // GIF89a Header
  pushAscii("GIF89a");
  pushU16(width);
  pushU16(height);
  // Global Color Table Flag (1), Color Res (7), Sort (0), Size (1 => 4 colors)
  out.push(0xf1, 0x00, 0x00);

  // 4-color Global Color Table: black, white, Nothing red (#d71921), neutral gray
  out.push(
    0x00, 0x00, 0x00,
    0xff, 0xff, 0xff,
    0xd7, 0x19, 0x21,
    0x78, 0x78, 0x78
  );

  // Netscape 2.0 loop extension
  out.push(0x21, 0xff, 0x0b);
  pushAscii("NETSCAPE2.0");
  out.push(0x03, 0x01, 0x00, 0x00, 0x00);

  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxRadius = Math.min(width, height) * 0.44;

  const encodeUncompressedFramePixels = (pixels: Uint8Array): number[] => {
    const packedBytes: number[] = [];
    let bitAcc = 0;
    let bitLen = 0;

    const writeCode9 = (code: number) => {
      bitAcc |= (code & 0x1ff) << bitLen;
      bitLen += 9;
      while (bitLen >= 8) {
        packedBytes.push(bitAcc & 0xff);
        bitAcc >>= 8;
        bitLen -= 8;
      }
    };

    writeCode9(256); // Initial CLEAR
    let sinceClear = 0;
    for (let i = 0; i < pixels.length; i += 1) {
      writeCode9(pixels[i] ?? 0);
      sinceClear += 1;
      // Reset table before dictionary reaches 512 codes so width remains 9 bits
      if (sinceClear >= 180) {
        writeCode9(256);
        sinceClear = 0;
      }
    }
    writeCode9(257); // EOI
    if (bitLen > 0) {
      packedBytes.push(bitAcc & 0xff);
    }

    const subBlocks: number[] = [0x08]; // LZW minimum code size = 8
    for (let i = 0; i < packedBytes.length; i += 250) {
      const slice = packedBytes.slice(i, i + 250);
      subBlocks.push(slice.length, ...slice);
    }
    subBlocks.push(0x00);
    return subBlocks;
  };

  const pixelBuf = new Uint8Array(width * height);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const phase = (frame / frameCount) * Math.PI * 2;
    const pulseX = cx + Math.cos(phase) * (width * 0.14);
    const pulseY = cy + Math.sin(phase) * (height * 0.12);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = x - pulseX;
        const dy = y - pulseY;
        const dist = Math.hypot(dx, dy);
        const orbitDot = Math.hypot(
          x - (cx - Math.cos(phase) * (width * 0.24)),
          y - (cy - Math.sin(phase) * (height * 0.2))
        );

        let colorIdx = 0;
        if (orbitDot < maxRadius * 0.22) {
          colorIdx = 2; // Red accent sphere
        } else if (dist < maxRadius * 0.48) {
          colorIdx = 1; // Bright core
        } else if (Math.abs((dist % 14) - 7) < 2.2) {
          colorIdx = 3; // Concentric harmonic ring
        }
        pixelBuf[y * width + x] = colorIdx;
      }
    }

    // Graphic Control Extension
    out.push(0x21, 0xf9, 0x04, 0x04);
    pushU16(delayCs);
    out.push(0x00, 0x00);

    // Image Descriptor
    out.push(0x2c);
    pushU16(0);
    pushU16(0);
    pushU16(width);
    pushU16(height);
    out.push(0x00);

    const blocks = encodeUncompressedFramePixels(pixelBuf);
    for (const byte of blocks) {
      out.push(byte);
    }
  }

  out.push(0x3b); // Trailer
  return new Uint8Array(out);
}

export function createProceduralSampleGifFile(): File {
  const bytes = createProceduralSampleGifBytes();
  return new File([Uint8Array.from(bytes)], "dottoh-motion-sample.gif", {
    type: "image/gif",
  });
}
