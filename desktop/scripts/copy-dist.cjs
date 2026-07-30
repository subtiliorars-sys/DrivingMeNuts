/**
 * copy-dist.cjs — copy the root Vite build (../dist) into ./dist so Electron can
 * bundle it. Cross-platform, zero dependencies (Node fs.cpSync, Node ≥ 16.7).
 *
 * Run automatically before `start` / packaging. If ../dist is missing it tells
 * you to build the web app first rather than packaging an empty shell.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "..", "dist");
const dest = path.join(__dirname, "..", "dist");

if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error(
    "\n[copy-dist] ../dist/index.html not found.\n" +
      "Build the web app first:  (from repo root)  npm run build\n",
  );
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[copy-dist] copied ${src} -> ${dest}`);
