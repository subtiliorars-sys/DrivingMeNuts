/**
 * make-icon.cjs — generate desktop/build/icon.png (a real 512×512 app icon)
 * using only Node built-ins (zlib). electron-builder derives the Windows .ico
 * and other formats from this PNG automatically at package time.
 *
 * The art: a warm roasted peanut on a cream rounded-square — the truck's
 * palette (ART_BIBLE: roasted-peanut browns, cream, market yellow). No external
 * assets, no provenance entry required (programmer-art, code-generated).
 *
 * Run: node desktop/scripts/make-icon.cjs
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const SIZE = 512;

// --- palette (Palette A) ---------------------------------------------------
const CREAM = [0xf5, 0xde, 0xb3];
const SHELL = [0xc6, 0x8a, 0x4e];
const SHELL_DARK = [0x8b, 0x6f, 0x47];
const OUTLINE = [0x5a, 0x3a, 0x1a];
const SPECKLE = [0xe8, 0xc9, 0x8f];

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Rounded-square mask: returns true if (x,y) is inside the card.
function inCard(x, y) {
  const m = 18; // inset margin → transparent corners
  const r = 70; // corner radius
  const lo = m;
  const hi = SIZE - m;
  if (x < lo || x > hi || y < lo || y > hi) return false;
  const cxs = [lo + r, hi - r];
  const cys = [lo + r, hi - r];
  for (const cx of cxs) {
    for (const cy of cys) {
      const inCorner =
        (cx === lo + r ? x < cx : x > cx) && (cy === lo + r ? y < cy : y > cy);
      if (inCorner) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) return false;
      }
    }
  }
  return true;
}

// Two overlapping lobes → a peanut silhouette.
const L = { x: 196, y: 256, r: 118 };
const R = { x: 316, y: 256, r: 118 };

function peanutDist(x, y) {
  return Math.min(Math.hypot(x - L.x, y - L.y) - L.r, Math.hypot(x - R.x, y - R.y) - R.r);
}

// Deterministic speckle pattern (no RNG needed for reproducible builds).
function isSpeckle(x, y) {
  const v = (Math.sin(x * 0.21) * Math.cos(y * 0.19) + Math.sin((x + y) * 0.11)) * 0.5;
  return v > 0.78;
}

function pixel(x, y) {
  if (!inCard(x, y)) return [0, 0, 0, 0]; // transparent outside card

  const pd = peanutDist(x, y);
  if (pd < 0) {
    // Inside the peanut.
    if (pd > -10) return [...OUTLINE, 255]; // shell rim
    // Vertical shading: lighter top, darker bottom for a roasted sheen.
    const t = (y - 130) / 252; // 0 at top of peanut → 1 at bottom
    let col = lerp(SHELL, SHELL_DARK, Math.max(0, Math.min(1, t)));
    // Waist seam (the pinch between the lobes).
    if (Math.abs(x - 256) < 6 && Math.abs(y - 256) < 96) col = SHELL_DARK;
    if (isSpeckle(x, y)) col = SPECKLE;
    return [...col, 255];
  }

  // Card background: cream with a soft radial vignette.
  const d = Math.hypot(x - 256, y - 256) / 320;
  const bg = lerp(CREAM, [0xe6, 0xc8, 0x96], Math.min(1, d));
  return [...bg, 255];
}

// --- raw RGBA scanlines (filter byte 0 per row) ----------------------------
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let o = 0;
for (let y = 0; y < SIZE; y++) {
  raw[o++] = 0; // filter type: None
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b, a] = pixel(x, y);
    raw[o++] = r;
    raw[o++] = g;
    raw[o++] = b;
    raw[o++] = a;
  }
}

// --- PNG container ---------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type: RGBA
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, "..", "build");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "icon.png");
fs.writeFileSync(outPath, png);
console.log(`Wrote ${outPath} (${SIZE}×${SIZE}, ${(png.length / 1024).toFixed(1)} KiB)`);
