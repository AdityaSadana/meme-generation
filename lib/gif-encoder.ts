// Pure TypeScript GIF encoder — no dependencies
// Supports animated GIFs with per-frame ImageData input

export interface GifFrame {
  imageData: ImageData;
  delay: number; // centiseconds (10 = 100ms = 10fps)
}

// ── Median-Cut Color Quantization ─────────────────────────────────────────────

function buildPalette(data: Uint8ClampedArray): Uint8Array {
  const NUM = 256;
  // Sample every 8th pixel for speed
  const px: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4 * 8) {
    px.push([data[i], data[i + 1], data[i + 2]]);
  }

  let buckets: [number, number, number][][] = [px];

  while (buckets.length < NUM) {
    let maxR = 0, maxI = 0;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].length < 2) continue;
      let rMn=255,rMx=0,gMn=255,gMx=0,bMn=255,bMx=0;
      for (const [r,g,b] of buckets[i]) {
        if(r<rMn)rMn=r;if(r>rMx)rMx=r;
        if(g<gMn)gMn=g;if(g>gMx)gMx=g;
        if(b<bMn)bMn=b;if(b>bMx)bMx=b;
      }
      const range = Math.max(rMx-rMn, gMx-gMn, bMx-bMn);
      if (range > maxR) { maxR = range; maxI = i; }
    }
    if (maxR === 0) break;

    const b = buckets[maxI];
    let rMn=255,rMx=0,gMn=255,gMx=0,bMn=255,bMx=0;
    for (const [r,g,bl] of b) {
      if(r<rMn)rMn=r;if(r>rMx)rMx=r;
      if(g<gMn)gMn=g;if(g>gMx)gMx=g;
      if(bl<bMn)bMn=bl;if(bl>bMx)bMx=bl;
    }
    const ch: 0|1|2 = (gMx-gMn)>=(rMx-rMn)&&(gMx-gMn)>=(bMx-bMn) ? 1 : (bMx-bMn)>=(rMx-rMn) ? 2 : 0;
    b.sort((a, x) => a[ch] - x[ch]);
    const mid = b.length >> 1;
    buckets.splice(maxI, 1, b.slice(0, mid), b.slice(mid));
  }

  const out = new Uint8Array(NUM * 3);
  for (let i = 0; i < buckets.length; i++) {
    let r=0,g=0,bl=0;
    for (const p of buckets[i]) { r+=p[0]; g+=p[1]; bl+=p[2]; }
    const n = buckets[i].length || 1;
    out[i*3]   = Math.round(r / n);
    out[i*3+1] = Math.round(g / n);
    out[i*3+2] = Math.round(bl / n);
  }
  return out;
}

function quantizeFrame(data: Uint8ClampedArray, palette: Uint8Array): Uint8Array {
  const NUM = 256;
  const out = new Uint8Array(data.length >> 2);
  const cache = new Map<number, number>();

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const key = (r << 16) | (g << 8) | b;
    let idx = cache.get(key);
    if (idx === undefined) {
      idx = 0;
      let min = Infinity;
      for (let k = 0; k < NUM; k++) {
        const dr=palette[k*3]-r, dg=palette[k*3+1]-g, db=palette[k*3+2]-b;
        const d = dr*dr + dg*dg + db*db;
        if (d < min) { min = d; idx = k; if (d === 0) break; }
      }
      cache.set(key, idx);
    }
    out[j] = idx;
  }
  return out;
}

// ── LZW Encoding ──────────────────────────────────────────────────────────────

function lzwEncode(pixels: Uint8Array): Uint8Array {
  // min code size = 8 for 256-color palette
  const clearCode = 256, eofCode = 257;
  let codeSize = 9, nextCode = 258;

  // Pre-allocate generous output buffer
  const outBuf = new Uint8Array(pixels.length * 2 + 64);
  let outPos = 0;
  let buf = 0, bits = 0;

  const emit = (code: number, size: number) => {
    buf |= code << bits; bits += size;
    while (bits >= 8) { outBuf[outPos++] = buf & 0xff; buf >>>= 8; bits -= 8; }
  };

  // Key: (prefix_code * 256 + next_pixel) — collision-free for codes < 4096
  const table = new Map<number, number>();
  const reset = () => { table.clear(); codeSize = 9; nextCode = 258; };

  reset();
  emit(clearCode, codeSize);

  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const c = pixels[i];
    const key = prefix * 256 + c;
    const found = table.get(key);
    if (found !== undefined) {
      prefix = found;
    } else {
      emit(prefix, codeSize);
      if (nextCode < 4096) {
        table.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clearCode, codeSize);
        reset();
      }
      prefix = c;
    }
  }
  emit(prefix, codeSize);
  emit(eofCode, codeSize);
  if (bits > 0) outBuf[outPos++] = buf & 0xff;

  return outBuf.subarray(0, outPos);
}

// ── GIF Binary Format ──────────────────────────────────────────────────────────

function subBlocks(data: Uint8Array): Uint8Array {
  const numChunks = Math.ceil(data.length / 255) || 1;
  const out = new Uint8Array(data.length + numChunks + 1);
  let pos = 0;
  for (let i = 0; i < data.length; i += 255) {
    const len = Math.min(255, data.length - i);
    out[pos++] = len;
    out.set(data.subarray(i, i + len), pos);
    pos += len;
  }
  out[pos] = 0; // block terminator
  return out;
}

function u16le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function encodeGif(
  frames: GifFrame[],
  width: number,
  height: number,
  loops = 0, // 0 = loop forever
): Blob {
  const parts: Uint8Array[] = [];
  const b = (...bytes: number[]) => parts.push(new Uint8Array(bytes));
  const str = (s: string) => parts.push(new Uint8Array([...s].map(c => c.charCodeAt(0))));

  // Build a single global palette from the first frame
  const palette = buildPalette(frames[0].imageData.data);

  // GIF89a Header + Logical Screen Descriptor
  str('GIF89a');
  parts.push(u16le(width), u16le(height));
  // Packed: GCT=1, color-res=7, sort=0, GCT-size=7 (2^8=256 colors)
  b(0xf7, 0, 0);
  parts.push(palette); // 768 bytes global color table

  // Netscape looping application extension
  b(0x21, 0xff, 11);
  str('NETSCAPE2.0');
  b(3, 1);
  parts.push(u16le(loops));
  b(0);

  for (const frame of frames) {
    const indexed = quantizeFrame(frame.imageData.data, palette);
    const lzwData = lzwEncode(indexed);

    // Graphics Control Extension
    b(0x21, 0xf9, 4, 0x00);
    parts.push(u16le(frame.delay));
    b(0, 0);

    // Image Descriptor (no local color table — use global)
    b(0x2c);
    parts.push(u16le(0), u16le(0), u16le(width), u16le(height));
    b(0x00); // no LCT, no interlace

    // LZW image data
    b(8); // min code size
    parts.push(subBlocks(lzwData));
  }

  b(0x3b); // GIF trailer
  return new Blob(parts as BlobPart[], { type: 'image/gif' });
}
