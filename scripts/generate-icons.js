// ---------------------------------------------------------------------------
// Compass Finance — Premium App Icon Generator
//
// Draws a stylized compass needle icon: elongated diamond pointing NE (bright
// gold) / SW (bronze) with a thin outer ring and cardinal tick marks. Pure
// Node.js + zlib — no image libraries, no network.
//
// Run: node scripts/generate-icons.js
// Output committed to public/icons/ — not part of the app build.
// ---------------------------------------------------------------------------
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ── Brand palette ───────────────────────────────────────────────────────────
const BG     = { r: 0x0B, g: 0x0E, b: 0x14 };   // #0B0E14
const GOLD   = { r: 0xF0, g: 0xB4, b: 0x29 };   // #F0B429 (NE needle)
const BRONZE = { r: 0x8B, g: 0x69, b: 0x14 };   // #8B6914 (SW needle)

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function blend(bg, fg, alpha) {
  return {
    r: lerp(bg.r, fg.r, alpha),
    g: lerp(bg.g, fg.g, alpha),
    b: lerp(bg.b, fg.b, alpha),
  };
}

/** Anti-aliased edge: 0 outside, 1 inside, smooth over ~1px. */
function smoothEdge(signedDist) {
  return Math.max(0, Math.min(1, signedDist + 0.5));
}

// ── Icon renderer ───────────────────────────────────────────────────────────
function drawCompassIcon(size, maskable) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;

  // Maskable icons must keep content within the inner 72% safe zone.
  const sf = maskable ? 0.68 : 1.0;

  const ringR         = size * 0.40 * sf;
  const ringThick     = Math.max(1.2, size * 0.013);
  const needleHalfLen = size * 0.30 * sf;
  const needleHalfW   = size * 0.058 * sf;
  const pivotR        = size * 0.040 * sf;
  const tickLen       = size * 0.060 * sf;
  const tickHalfW     = Math.max(0.8, size * 0.009);

  const COS45 = Math.SQRT1_2;
  const SIN45 = Math.SQRT1_2;

  // Cardinal direction vectors (N, E, S, W)
  const cardinals = [
    { ax:  0, ay: -1 },
    { ax:  1, ay:  0 },
    { ax:  0, ay:  1 },
    { ax: -1, ay:  0 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      let color = { ...BG };

      // ── 1. Outer ring (subtle gold, ~35% opacity) ──────────────────
      const ringEdgeDist = ringThick / 2 - Math.abs(dist - ringR);
      if (ringEdgeDist > -1) {
        const ringAlpha = smoothEdge(ringEdgeDist) * 0.35;
        color = blend(color, GOLD, ringAlpha);
      }

      // ── 2. Cardinal tick marks ─────────────────────────────────────
      for (const c of cardinals) {
        const along = dx * c.ax + dy * c.ay;
        const perp = Math.abs(dx * c.ay - dy * c.ax);
        if (along >= ringR - tickLen && along <= ringR + ringThick / 2 && perp <= tickHalfW) {
          const edgeDist = Math.min(
            tickHalfW - perp,
            along - (ringR - tickLen),
            ringR + ringThick / 2 - along,
          );
          const tickAlpha = smoothEdge(edgeDist) * 0.50;
          color = blend(color, GOLD, tickAlpha);
        }
      }

      // ── 3. Compass needle (45° diamond: NE = gold, SW = bronze) ────
      const u =  dx * COS45 + dy * SIN45;   // along NE–SW axis
      const v = -dx * SIN45 + dy * COS45;   // perpendicular

      const normalizedU = Math.abs(u) / needleHalfLen;
      if (normalizedU <= 1) {
        const maxV = needleHalfW * (1 - normalizedU);   // linear taper
        const needleEdgeDist = maxV - Math.abs(v);
        if (needleEdgeDist > -1) {
          const alpha = smoothEdge(needleEdgeDist);
          if (u >= 0) {
            // NE half — bright gold with subtle brightness gradient toward tip
            const boost = 0.85 + 0.15 * normalizedU;
            const tipGold = {
              r: Math.min(255, Math.round(GOLD.r * boost)),
              g: Math.min(255, Math.round(GOLD.g * boost)),
              b: Math.min(255, Math.round(GOLD.b * boost)),
            };
            color = blend(color, tipGold, alpha);
          } else {
            // SW half — muted bronze
            color = blend(color, BRONZE, alpha);
          }
        }
      }

      // ── 4. Center pivot dot ────────────────────────────────────────
      const pivotDist = pivotR - dist;
      if (pivotDist > -1) {
        const pivotAlpha = smoothEdge(pivotDist);
        color = blend(color, GOLD, pivotAlpha);
      }

      px[idx]     = color.r;
      px[idx + 1] = color.g;
      px[idx + 2] = color.b;
      px[idx + 3] = 255;
    }
  }
  return px;
}

// ── PNG encoder (minimal, no dependencies) ──────────────────────────────────
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (~crc) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA

  const rowSize = size * 4;
  const raw = Buffer.alloc((rowSize + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowSize + 1)] = 0; // filter: none
    pixels.copy(raw, y * (rowSize + 1) + 1, y * rowSize, y * rowSize + rowSize);
  }
  const idatData = zlib.deflateSync(raw);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idatData),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Generate ────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { size: 192, name: "icon-192.png",        maskable: false },
  { size: 512, name: "icon-512.png",        maskable: false },
  { size: 512, name: "icon-512-maskable.png", maskable: true },
  { size: 180, name: "apple-touch-icon.png", maskable: false },
];

for (const t of targets) {
  const pixels = drawCompassIcon(t.size, t.maskable);
  fs.writeFileSync(path.join(outDir, t.name), encodePNG(t.size, pixels));
  console.log("wrote", t.name, `(${t.size}x${t.size}${t.maskable ? " maskable" : ""})`);
}
