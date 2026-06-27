// One-off icon generator. Pure Node + zlib (built-in) — no image libs,
// no network. Draws a simple gold ring mark on the brand background,
// matching the dashboard's ProgressRing motif. Run once; output PNGs
// are committed, this script is not part of the app build.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const BG = [0x0b, 0x0e, 0x14];
const GOLD = [0xf0, 0xb4, 0x29];

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

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function drawRingIcon(size, ringFraction = 0.78, thicknessFraction = 0.085, maskable = false) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  // Maskable icons need content within a smaller "safe zone" circle.
  const outerR = (size / 2) * (maskable ? ringFraction * 0.78 : ringFraction);
  const thickness = size * thicknessFraction;
  const innerR = outerR - thickness;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;
      const onRing = dist <= outerR && dist >= innerR;
      const color = onRing ? GOLD : BG;
      px[idx] = color[0];
      px[idx + 1] = color[1];
      px[idx + 2] = color[2];
      px[idx + 3] = 255;
    }
  }
  return px;
}

function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

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
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

for (const { size, name, maskable } of [
  { size: 192, name: "icon-192.png", maskable: false },
  { size: 512, name: "icon-512.png", maskable: false },
  { size: 180, name: "apple-touch-icon.png", maskable: false },
]) {
  const pixels = drawRingIcon(size, 0.78, 0.085, maskable);
  fs.writeFileSync(path.join(outDir, name), encodePNG(size, pixels));
  console.log("wrote", name);
}
