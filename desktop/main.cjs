/**
 * main.cjs — Electron main process for the Driving Me Nuts desktop build.
 *
 * Wraps the Vite-built web game (../dist) in a native window so it can ship on
 * Steam and to Windows desktops. The renderer is the exact same game that runs
 * in the browser — this process only owns the window, the menu, fullscreen, and
 * lifecycle.
 *
 * Security posture (Electron hardening checklist):
 *   - contextIsolation: true, nodeIntegration: false, sandbox: true
 *   - no remote module, no arbitrary navigation, external links open in the OS
 *     browser (never inside the app), no new windows
 * The game is fully offline and self-contained (CRIT-1: zero network / zero
 * data collection), so the renderer never needs Node or network privileges.
 */
"use strict";

const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const GAME_TITLE = "Driving Me Nuts";
const isDev = !app.isPackaged;

/** Resolve the built index.html (packaged: inside resources; dev: ../dist). */
function indexHtmlPath() {
  // In production the dist folder is bundled via electron-builder `files`/`extraResources`.
  return path.join(__dirname, "dist", "index.html");
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    backgroundColor: "#1a1008", // matches the game canvas clear colour (no white flash)
    title: GAME_TITLE,
    autoHideMenuBar: true, // keep the cozy fullscreen feel; Alt reveals the menu
    icon: path.join(__dirname, "build", "icon.png"),
    show: false, // show once ready to avoid a blank-window flash
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // Show only when the first paint is ready (smooth launch).
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // CI smoke mode: prove the shell loads the game, then exit cleanly. Set by
  // the headless launch test (xvfb). A load FAILURE exits non-zero so CI fails.
  if (process.env.DMN_SMOKE) {
    mainWindow.webContents.on("did-finish-load", () => {
      console.log("[smoke] renderer loaded OK");
      // Optional: capture a screenshot for play-test evidence / CI visual check.
      if (process.env.DMN_SHOT) {
        setTimeout(async () => {
          try {
            // Optionally jump straight into gameplay before the shot.
            if (process.env.DMN_START) {
              await mainWindow.webContents.executeJavaScript(
                "if(window.__DMN_GAME__){window.__DMN_GAME__.scene.stop('BootScene');window.__DMN_GAME__.scene.start('GameScene');} true;",
              );
              await new Promise((r) => setTimeout(r, 1200));
            }
            const img = await mainWindow.webContents.capturePage();
            require("fs").writeFileSync(process.env.DMN_SHOT, img.toPNG());
            console.log(`[smoke] screenshot written: ${process.env.DMN_SHOT}`);
          } catch (e) {
            console.error("[smoke] screenshot failed:", e);
          }
          app.exit(0);
        }, 1500);
        return;
      }
      setTimeout(() => app.exit(0), 800);
    });
    mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
      console.error(`[smoke] renderer failed to load: ${code} ${desc}`);
      app.exit(1);
    });
  }

  // Harden navigation: the game is a single local page. Block any attempt to
  // navigate away, and route real external links to the OS browser.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    // Dev: load the running Vite server for HMR if VITE_DEV_SERVER is set,
    // else load the built file. (npm run electron:dev sets the env var.)
    const devUrl = process.env.VITE_DEV_SERVER;
    if (devUrl) mainWindow.loadURL(devUrl);
    else mainWindow.loadFile(indexHtmlPath());
  } else {
    mainWindow.loadFile(indexHtmlPath());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/** Minimal native menu — fullscreen toggle, reload (dev), quit, about. */
function buildMenu() {
  const template = [
    {
      label: "Game",
      submenu: [
        {
          label: "Toggle Fullscreen",
          accelerator: "F11",
          click: () => {
            if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
          },
        },
        { type: "separator" },
        { role: "quit", label: "Quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        ...(isDev
          ? [
              { role: "reload" },
              { role: "forceReload" },
              { role: "toggleDevTools" },
              { type: "separator" },
            ]
          : []),
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: `About ${GAME_TITLE}`,
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: `About ${GAME_TITLE}`,
              message: GAME_TITLE,
              detail:
                "A cozy pixel-art RPG + idle game about a roasted-peanut food truck.\n\n" +
                "Peanuts aren't nuts — they're legumes. I know, I know… it's driving me nuts!\n\n" +
                `Version ${app.getVersion()}`,
              buttons: ["Nice"],
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Single-instance lock — a second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    // Standard desktop behaviour: quit on Windows/Linux; stay alive on macOS.
    if (process.platform !== "darwin") app.quit();
  });
}
