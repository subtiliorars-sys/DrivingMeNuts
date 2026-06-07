/**
 * boot-smoke-setup.ts — jsdom canvas stub for Phaser 3 headless boot tests.
 *
 * WHY THIS EXISTS
 * ---------------
 * Phaser 3's `src/device/CanvasFeatures.js` (and `src/device/Features.js`)
 * run IIFEs at module-evaluation time that call `canvas.getContext('2d')`.
 * Under jsdom (without the native `canvas` npm package), that call returns
 * null/throws "Not implemented", which crashes Phaser during module load —
 * before any test code or `beforeAll` hook can run.
 *
 * FIX
 * ---
 * Vitest's `setupFiles` run inside the worker, in the same JS context as the
 * tests, BEFORE test-file collection begins.  By patching
 * `HTMLCanvasElement.prototype.getContext` here we ensure the stub is in place
 * when `import "phaser"` triggers the ESM bundle evaluation.
 *
 * The fake context satisfies every probe Phaser runs at load time:
 *   - checkInverseAlpha  → reads fillStyle, getImageData
 *   - checkBlendMode     → creates an Image, writes globalCompositeOperation
 *
 * NOTE: we do NOT install the native `canvas` package.  Phaser HEADLESS never
 * renders, so we only need the context stubs that fire during module load.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const fakeCtx: Partial<CanvasRenderingContext2D> & Record<string, unknown> = {
  fillStyle: "" as string | CanvasGradient | CanvasPattern,
  globalCompositeOperation: "source-over" as GlobalCompositeOperation,
  fillRect(_x: number, _y: number, _w: number, _h: number) {},
  clearRect(_x: number, _y: number, _w: number, _h: number) {},
  drawImage(..._args: unknown[]) {},
  save() {},
  restore() {},
  translate(_x: number, _y: number) {},
  scale(_x: number, _y: number) {},
  rotate(_angle: number) {},
  getImageData(
    _sx: number, _sy: number, _sw: number, _sh: number,
  ): ImageData {
    return { data: new Uint8ClampedArray(4), width: 1, height: 1, colorSpace: "srgb" };
  },
  putImageData(_d: ImageData, _x: number, _y: number) {},
  createLinearGradient(
    _x0: number, _y0: number, _x1: number, _y1: number,
  ): CanvasGradient {
    return { addColorStop(_offset: number, _color: string) {} } as CanvasGradient;
  },
  createPattern(_image: unknown, _repetition: string | null): CanvasPattern | null {
    return null;
  },
  beginPath() {},
  closePath() {},
  moveTo(_x: number, _y: number) {},
  lineTo(_x: number, _y: number) {},
  arc(_x: number, _y: number, _r: number, _sa: number, _ea: number) {},
  stroke() {},
  fill() {},
  clip() {},
  measureText(_text: string): TextMetrics {
    return { width: 0 } as TextMetrics;
  },
  setTransform(..._args: unknown[]) {},
  canvas: {} as HTMLCanvasElement,
};

// Patch the prototype so every canvas element — whether created by jsdom
// or by Phaser's internal bootstrap — returns the stub context.
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: (_contextId: string) => fakeCtx,
  writable: true,
  configurable: true,
});
