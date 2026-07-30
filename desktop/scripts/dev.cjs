/**
 * dev.cjs — launch Electron pointed at the running Vite dev server for HMR.
 *
 * Cross-platform replacement for `cross-env` (no extra dependency). Start the
 * Vite server first in another terminal (from repo root):  npm run dev
 * then:  npm run electron:dev   (from desktop/)
 */
"use strict";

const { spawn } = require("child_process");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electron = require("electron"); // resolves to the electron binary path
const env = { ...process.env, VITE_DEV_SERVER: process.env.VITE_DEV_SERVER || "http://localhost:3000" };

const child = spawn(electron, ["."], { stdio: "inherit", env });
child.on("close", (code) => process.exit(code ?? 0));
