/**
 * build-assets.cjs — code-as-art-tool: a procedural pixel-art generator.
 *
 * This is the proof that "I can't make real art without an external tool" is an
 * environmental limit, not a fundamental one. Code IS the art tool: this file is
 * a tiny pixel-art engine (palette + draw primitives + a clean outline pass +
 * nearest-neighbour upscale + a hand-rolled PNG encoder) that emits real,
 * game-ready sprites — outlined, shaded, on-brand — with zero dependencies and
 * zero external assets.
 *
 * Output: assets/generated/*.png (8× crisp) + _contact-sheet.png.
 * Run:    node tools/art/build-assets.cjs
 *
 * Provenance: 100% code-generated (deterministic). AI-disclosure stance is
 * "disclose openly" — see assets/generated/README.md.
 */
"use strict";
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Palette A (ART_BIBLE) + a richer pixel-art ramp for shading.
// ---------------------------------------------------------------------------
const C = {
  none: [0, 0, 0, 0],
  outline: [0x3a, 0x24, 0x12, 255],
  shellHi: [0xe8, 0xbe, 0x82, 255],
  shell: [0xd9, 0xa0, 0x66, 255],
  shellMid: [0xc6, 0x8a, 0x4e, 255],
  shellLo: [0x9c, 0x6b, 0x3a, 255],
  cream: [0xf5, 0xde, 0xb3, 255],
  creamLo: [0xe6, 0xc8, 0x96, 255],
  gold: [0xff, 0xcf, 0x40, 255],
  goldHi: [0xff, 0xe8, 0x8a, 255],
  goldLo: [0xc9, 0x97, 0x1e, 255],
  bagHi: [0xd8, 0xb8, 0x84, 255],
  bag: [0xc2, 0x9c, 0x63, 255],
  bagLo: [0xa3, 0x7e, 0x49, 255],
  awning: [0xff, 0x98, 0x00, 255],
  eye: [0x2c, 0x24, 0x16, 255],
  white: [0xff, 0xf6, 0xe0, 255],
};

// ---------------------------------------------------------------------------
// Pixel buffer + drawing primitives
// ---------------------------------------------------------------------------
class Px {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4); // all transparent
  }
  idx(x, y) {
    return (y * this.w + x) * 4;
  }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c || c[3] === 0) return;
    const i = this.idx(x, y);
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3];
  }
  opaque(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.data[this.idx(x, y) + 3] > 0;
  }
  fillRect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  disc(cx, cy, r, c) {
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++)
        if (i * i + j * j <= r * r) this.set(cx + i, cy + j, c);
  }
  // Even-odd polygon fill (points: [[x,y],...]) — robust for stars/bags.
  fillPoly(points, c) {
    let minY = Infinity,
      maxY = -Infinity;
    for (const [, y] of points) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if (y1 === y2) continue;
        if (y >= Math.min(y1, y2) && y < Math.max(y1, y2)) {
          xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x <= Math.round(xs[k + 1]); x++) this.set(x, y, c);
      }
    }
  }
  // Add a 1px outline around every opaque cluster (classic pixel-art read).
  outline(c) {
    const snap = Uint8ClampedArray.from(this.data);
    const wasOpaque = (x, y) =>
      x >= 0 && y >= 0 && x < this.w && y < this.h && snap[this.idx(x, y) + 3] > 0;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (wasOpaque(x, y)) continue;
        if (wasOpaque(x - 1, y) || wasOpaque(x + 1, y) || wasOpaque(x, y - 1) || wasOpaque(x, y + 1))
          this.set(x, y, c);
      }
  }
  scale(n) {
    const out = new Px(this.w * n, this.h * n);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = this.idx(x, y);
        const c = [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
        if (c[3] === 0) continue;
        out.fillRect(x * n, y * n, n, n, c);
      }
    return out;
  }
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = src.idx(x, y);
        if (src.data[i + 3] === 0) continue;
        this.set(dx + x, dy + y, [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]]);
      }
  }
}

// ---------------------------------------------------------------------------
// PNG encoder (RGBA, hand-rolled — Node built-ins only)
// ---------------------------------------------------------------------------
const CRC = (() => {
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
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function writePNG(px, file) {
  const raw = Buffer.alloc(px.h * (px.w * 4 + 1));
  let o = 0;
  for (let y = 0; y < px.h; y++) {
    raw[o++] = 0;
    for (let x = 0; x < px.w; x++) {
      const i = px.idx(x, y);
      raw[o++] = px.data[i];
      raw[o++] = px.data[i + 1];
      raw[o++] = px.data[i + 2];
      raw[o++] = px.data[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(px.w, 0);
  ihdr.writeUInt32BE(px.h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

// ---------------------------------------------------------------------------
// Sprites (native 32×32 unless noted)
// ---------------------------------------------------------------------------
function shadedLobe(p, cx, cy, r) {
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      if (i * i + j * j > r * r) continue;
      // light from top-left
      const d = (i + j) / (2 * r);
      let c = C.shell;
      if (d < -0.45) c = C.shellHi;
      else if (d < 0.05) c = C.shell;
      else if (d < 0.5) c = C.shellMid;
      else c = C.shellLo;
      p.set(cx + i, cy + j, c);
    }
}

function spriteRoastedPeanut() {
  const p = new Px(32, 32);
  // Two stacked lobes + waist → shelled peanut silhouette.
  shadedLobe(p, 16, 11, 8);
  shadedLobe(p, 16, 21, 9);
  p.fillRect(9, 13, 14, 8, C.shell); // waist fill
  // re-shade waist quickly
  for (let y = 13; y < 21; y++)
    for (let x = 9; x < 23; x++) {
      const d = (x - 16 + (y - 17)) / 22;
      p.set(x, y, d < -0.1 ? C.shell : d < 0.3 ? C.shellMid : C.shellLo);
    }
  // Shell netting texture (the cross-hatch on a peanut shell).
  for (let y = 4; y < 30; y += 3)
    for (let x = 8; x < 25; x += 3) if (p.opaque(x, y)) p.set(x, y, C.shellLo);
  for (let y = 5; y < 30; y += 3)
    for (let x = 10; x < 25; x += 4) if (p.opaque(x, y)) p.set(x, y, C.shellHi);
  // Specular highlight.
  p.disc(13, 8, 1, C.shellHi);
  p.outline(C.outline);
  return p;
}

function spritePeanutFace() {
  // The mascot: a peanut with a cheeky face (legume, not a nut — and it knows).
  const p = spriteRoastedPeanut();
  p.fillRect(12, 9, 3, 3, C.white);
  p.fillRect(18, 9, 3, 3, C.white);
  p.set(13, 10, C.eye);
  p.set(19, 10, C.eye);
  // little smile
  for (let x = 13; x <= 19; x++) p.set(x, 14 + (x === 13 || x === 19 ? -1 : 0), C.eye);
  return p;
}

function spriteCoin() {
  const p = new Px(32, 32);
  p.disc(16, 16, 12, C.gold);
  // bevel
  for (let j = -12; j <= 12; j++)
    for (let i = -12; i <= 12; i++) {
      const d = i * i + j * j;
      if (d > 144) continue;
      if (d > 110) p.set(16 + i, 16 + j, C.goldLo);
      else if ((i + j) / 24 < -0.3) p.set(16 + i, 16 + j, C.goldHi);
    }
  // embossed peanut glyph
  const pn = new Px(32, 32);
  shadedLobe(pn, 16, 13, 4);
  shadedLobe(pn, 16, 19, 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) if (pn.opaque(x, y)) p.set(x, y, C.goldLo);
  p.disc(12, 11, 1, C.goldHi);
  p.outline(C.outline);
  return p;
}

function spriteStar() {
  const p = new Px(32, 32);
  const pts = [];
  const cx = 16,
    cy = 16,
    R = 14,
    r = 6;
  for (let k = 0; k < 10; k++) {
    const ang = -Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 === 0 ? R : r;
    pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
  }
  p.fillPoly(pts, C.gold);
  // top-left highlight half
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++)
      if (p.opaque(x, y) && (x - 16 + (y - 16)) < -3) p.set(x, y, C.goldHi);
  p.outline(C.outline);
  return p;
}

function spritePeanutBag() {
  const p = new Px(32, 32);
  // paper bag body (trapezoid, wider at top)
  p.fillPoly(
    [
      [8, 12],
      [24, 12],
      [26, 30],
      [6, 30],
    ],
    C.bag,
  );
  // shading on right third
  for (let y = 12; y < 31; y++)
    for (let x = 18; x < 27; x++) if (p.opaque(x, y)) p.set(x, y, C.bagLo);
  for (let y = 12; y < 31; y++)
    for (let x = 6; x < 11; x++) if (p.opaque(x, y)) p.set(x, y, C.bagHi);
  // rolled top
  p.fillRect(7, 9, 18, 4, C.bagHi);
  p.fillRect(7, 9, 18, 1, C.bagLo);
  // peanuts peeking out
  const pn = new Px(32, 32);
  shadedLobe(pn, 13, 8, 3);
  shadedLobe(pn, 19, 7, 3);
  p.blit(pn, 0, -2);
  // label band
  p.fillRect(10, 19, 12, 7, C.cream);
  p.set(13, 22, C.shellLo);
  p.set(16, 22, C.shellLo);
  p.set(19, 22, C.shellLo);
  p.outline(C.outline);
  return p;
}

function spriteAwningSign() {
  // A little hanging shop sign: "NUTS" board under a striped awning.
  const p = new Px(40, 28);
  // awning stripes
  for (let x = 2; x < 38; x++) p.fillRect(x, 2, 1, 5, (x >> 1) % 2 ? C.awning : C.cream);
  p.fillRect(2, 7, 36, 1, C.outline);
  // board
  p.fillRect(6, 10, 28, 14, C.shell);
  p.fillRect(6, 10, 28, 2, C.shellHi);
  p.fillRect(6, 22, 28, 2, C.shellLo);
  // tiny peanut glyph on the board
  const pn = new Px(40, 28);
  shadedLobe(pn, 20, 15, 3);
  shadedLobe(pn, 20, 20, 3);
  p.blit(pn, 0, 0);
  p.outline(C.outline);
  return p;
}

// ---------------------------------------------------------------------------
// NPC portraits — a parametric pixel-art face builder (32×32). Each regular
// gets a distinct silhouette via skin/hair/hat/accessory so they're readable
// at a glance in the Regulars panel.
// ---------------------------------------------------------------------------
const SKIN = {
  light: [0xf0, 0xc8, 0xa0, 255],
  lightLo: [0xd8, 0xab, 0x82, 255],
  med: [0xc8, 0x9a, 0x6b, 255],
  medLo: [0xa8, 0x7c, 0x52, 255],
  tan: [0xe2, 0xb88, 0x80, 255], // fixed below
  brown: [0x8d, 0x5a, 0x3b, 255],
  brownLo: [0x6f, 0x44, 0x2c, 255],
};
SKIN.tan = [0xe2, 0xb8, 0x80, 255];
SKIN.tanLo = [0xc4, 0x9a, 0x66, 255];

function drawFace(opts) {
  const p = new Px(32, 32);
  const skin = opts.skin;
  const skinLo = opts.skinLo;
  // neck
  p.fillRect(13, 24, 6, 5, skinLo);
  // head (rounded): disc + a squared jaw
  p.disc(16, 15, 10, skin);
  p.fillRect(7, 12, 18, 9, skin);
  // jaw shade on right
  for (let y = 8; y < 25; y++)
    for (let x = 18; x < 26; x++) if (p.opaque(x, y)) p.set(x, y, skinLo);

  // ears
  p.disc(7, 16, 2, skin);
  p.disc(25, 16, 2, skin);

  // beard (lower jaw) before hair so hair overlays the top
  if (opts.beard) {
    const bc = opts.hair;
    for (let y = 18; y < 26; y++)
      for (let x = 8; x < 24; x++) {
        const d = Math.hypot(x - 16, y - 16);
        if (d < 10 && d > 6 && y > 17) p.set(x, y, bc);
      }
    p.fillRect(11, 23, 10, 3, bc);
  }

  // hair styles
  const hair = opts.hair;
  if (opts.hairStyle === "short" || opts.hairStyle === "bun") {
    // hair cap across the top of the head
    for (let y = 4; y < 14; y++)
      for (let x = 6; x < 26; x++) {
        const d = Math.hypot(x - 16, y - 14);
        if (d < 11 && y < 12) p.set(x, y, hair);
      }
    p.fillRect(6, 11, 4, 4, hair); // sideburn L
    p.fillRect(22, 11, 4, 4, hair); // sideburn R
  }
  if (opts.hairStyle === "bun") {
    p.disc(16, 4, 4, hair);
  }
  if (opts.hairStyle === "bald") {
    // fringe ring only (sides), bald top
    p.fillRect(6, 13, 3, 4, hair);
    p.fillRect(23, 13, 3, 4, hair);
  }

  // eyes
  p.fillRect(11, 15, 2, 2, C.outline);
  p.fillRect(19, 15, 2, 2, C.outline);
  // brows
  p.set(11, 13, hair);
  p.set(12, 13, hair);
  p.set(19, 13, hair);
  p.set(20, 13, hair);
  // smile
  p.set(14, 20, C.outline);
  p.set(15, 21, C.outline);
  p.set(16, 21, C.outline);
  p.set(17, 21, C.outline);
  p.set(18, 20, C.outline);

  // glasses
  if (opts.glasses) {
    const gl = [0x33, 0x33, 0x33, 255];
    for (const cx of [12, 20]) p.disc(cx, 16, 3, [0, 0, 0, 0]); // clear lens area
    const ring = (cx) => {
      for (let a = 0; a < 360; a += 30) {
        const x = Math.round(cx + Math.cos((a * Math.PI) / 180) * 3);
        const y = Math.round(16 + Math.sin((a * Math.PI) / 180) * 3);
        p.set(x, y, gl);
      }
    };
    ring(12); ring(20);
    p.fillRect(15, 16, 2, 1, gl); // bridge
    // restore eyes inside lenses
    p.fillRect(11, 15, 2, 2, C.outline);
    p.fillRect(19, 15, 2, 2, C.outline);
  }

  // hats
  if (opts.hat === "flatcap") {
    const hc = opts.hatColor;
    p.fillRect(6, 6, 20, 5, hc);
    p.fillRect(5, 10, 8, 2, hc); // brim
    for (let x = 6; x < 26; x++) p.set(x, 6, [hc[0] + 20, hc[1] + 20, hc[2] + 20, 255]);
  } else if (opts.hat === "cap") {
    const hc = opts.hatColor;
    for (let y = 3; y < 11; y++)
      for (let x = 7; x < 25; x++) {
        const d = Math.hypot(x - 16, y - 11);
        if (d < 9 && y < 10) p.set(x, y, hc);
      }
    p.fillRect(4, 10, 12, 2, hc); // bill
  } else if (opts.hat === "visor") {
    const hc = opts.hatColor;
    p.fillRect(6, 9, 20, 3, hc); // band
    p.fillRect(3, 11, 14, 2, [hc[0], hc[1], hc[2], 200]); // translucent-ish bill
  }

  // suit collar + tie
  if (opts.collar === "suit") {
    const sc = [0x33, 0x3a, 0x4a, 255];
    p.fillRect(8, 26, 16, 4, sc);
    p.fillPoly([[13, 26], [19, 26], [16, 30]], C.cream); // shirt V
    // tie
    const tc = opts.tieColor || [0xc0, 0x39, 0x2b, 255];
    p.fillPoly([[15, 26], [17, 26], [18, 30], [14, 30]], tc);
  }

  p.outline(C.outline);
  return p;
}

const PORTRAITS = {
  old_joe: drawFace({ skin: SKIN.tan, skinLo: SKIN.tanLo, hair: [0xcc, 0xcc, 0xcc, 255], hairStyle: "bald", beard: true, hat: "flatcap", hatColor: [0x6b, 0x55, 0x3b, 255] }),
  marta: drawFace({ skin: SKIN.light, skinLo: SKIN.lightLo, hair: [0xbf, 0xbf, 0xc4, 255], hairStyle: "bun", glasses: true }),
  derek: drawFace({ skin: SKIN.med, skinLo: SKIN.medLo, hair: [0x6b, 0x4a, 0x2c, 255], hairStyle: "short", collar: "suit", tieColor: [0xc0, 0x39, 0x2b, 255] }),
  sal: drawFace({ skin: SKIN.med, skinLo: SKIN.medLo, hair: [0x2c, 0x24, 0x16, 255], hairStyle: "short", beard: true, hat: "cap", hatColor: [0x2a, 0x3a, 0x6b, 255] }),
  maya: drawFace({ skin: SKIN.brown, skinLo: SKIN.brownLo, hair: [0x1a, 0x14, 0x10, 255], hairStyle: "short", hat: "visor", hatColor: [0x3a, 0x8c, 0x5e, 255] }),
  dr_chen: drawFace({ skin: SKIN.light, skinLo: SKIN.lightLo, hair: [0x20, 0x20, 0x28, 255], hairStyle: "short", glasses: true }),
};

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const SPRITES = {
  "roasted-peanut": spriteRoastedPeanut(),
  "peanut-mascot": spritePeanutFace(),
  coin: spriteCoin(),
  star: spriteStar(),
  "peanut-bag": spritePeanutBag(),
  "shop-sign": spriteAwningSign(),
  "npc-old_joe": PORTRAITS.old_joe,
  "npc-marta": PORTRAITS.marta,
  "npc-derek": PORTRAITS.derek,
  "npc-sal": PORTRAITS.sal,
  "npc-maya": PORTRAITS.maya,
  "npc-dr_chen": PORTRAITS.dr_chen,
};

const gameDir = path.join(__dirname, "..", "..", "public", "generated");
const refDir = path.join(__dirname, "..", "..", "assets", "generated");
fs.mkdirSync(gameDir, { recursive: true });
fs.mkdirSync(refDir, { recursive: true });

const EXPORT_SCALE = 8;
const names = Object.keys(SPRITES);
for (const name of names) {
  const big = SPRITES[name].scale(EXPORT_SCALE);
  const bytes = writePNG(big, path.join(gameDir, `${name}.png`));
  console.log(`  ${name}.png  ${big.w}×${big.h}  ${(bytes / 1024).toFixed(1)} KiB`);
}

// Contact sheet: all sprites on a cream grid, 6× scale, labelled by position.
const CELL = 32 * 6 + 16;
const cols = 3;
const rows = Math.ceil(names.length / cols);
const sheet = new Px(cols * CELL, rows * CELL);
sheet.fillRect(0, 0, sheet.w, sheet.h, C.cream);
for (let y = 0; y < sheet.h; y++)
  for (let x = 0; x < sheet.w; x++) {
    const d = Math.hypot(x - sheet.w / 2, y - sheet.h / 2) / sheet.w;
    if (d > 0.5) sheet.set(x, y, C.creamLo);
  }
names.forEach((name, k) => {
  const col = k % cols;
  const row = Math.floor(k / cols);
  const big = SPRITES[name].scale(6);
  const cx = col * CELL + (CELL - big.w) / 2;
  const cy = row * CELL + (CELL - big.h) / 2;
  sheet.blit(big, Math.round(cx), Math.round(cy));
});
const sheetBytes = writePNG(sheet, path.join(refDir, "_contact-sheet.png"));
console.log(`  _contact-sheet.png  ${sheet.w}×${sheet.h}  ${(sheetBytes / 1024).toFixed(1)} KiB`);
console.log(`\nWrote ${names.length} game sprites to ${gameDir}`);
console.log(`Wrote contact sheet to ${refDir}`);
