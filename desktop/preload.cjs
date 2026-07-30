/**
 * preload.cjs — runs in an isolated context before the renderer loads.
 *
 * Deliberately minimal: the game is a self-contained offline web app that needs
 * no privileged APIs (no filesystem, no network, no Node). We expose a tiny,
 * read-only marker so the renderer can detect it's running inside the desktop
 * shell (e.g. to show "Quit" instead of relying on the browser tab). Nothing
 * here grants the renderer any capability it couldn't already have.
 */
"use strict";

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("DMN_DESKTOP", {
  isDesktop: true,
  platform: process.platform,
});
