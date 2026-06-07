/**
 * GameScene.ts — P1 idle-core slice, Farmers' Market district.
 *
 * Architecture rules (enforced here):
 *   - NO game logic in this file. All math lives in src/sim/.
 *   - Every UI mutation is driven by reading SimState after a sim call.
 *   - Phaser update() calls tick(state, dt) each frame.
 *   - All palette colors match ART_BIBLE.md "Palette A: Golden Market".
 *   - All rect sizes match P1_SPRITE_SPEC.md "Programmer art" entries exactly.
 *
 * Palette A hex constants (single reference — do not invent new colors):
 *   PANEL_BG     #F5DEB3  — panel background / truck trim / burlap
 *   PANEL_BORDER #8B6F47  — panel border / truck body / shadow
 *   PANEL_TEXT   #2C2416  — all body text
 *   CASH_GREEN   #4A7C4E  — profit figures
 *   WARNING_RED  #C0392B  — price-too-low / alert
 *   TRUCK_BODY   #8B6F47  — main truck fill
 *   TRUCK_TRIM   #F5DEB3  — roof edge / windows
 *   GROUND       #7CB342  — grass
 *   SKY          #FFFFCC  — backdrop upper region
 *   AWNING       #FF9800  — market stall awning / active highlight
 *   SLOT_EMPTY   #CCCCCC  — empty roast slot
 *   SLOT_ROAST   #FF9800  — roasting slot (same as awning)
 *   SLOT_READY   #7CB342  — ready slot (same as ground green)
 *   COIN_GOLD    #FFD700  — currency / coin pop
 *   NPC_SKIN     #E8D4B0  — NPC bodies
 */

import Phaser from "phaser";
import {
  createState,
  tick,
  buyRaw,
  startRoast,
  setPrice,
  endOfDay,
  projectedDemand,
  optimumPrice,
  buyRoasterUpgrade,
  buyQueueSlot,
  chooseRescuePath,
  type RescuePath,
} from "../sim/engine.js";
import type { SimState, DayReport } from "../sim/types.js";
import { tryLoad, trySave, resetSave, safeStorage, serialize, importEnvelopeText } from "../sim/persistence.js";
import { LORE_BY_ID } from "../data/lore.js";
import { drawLegsy } from "./legsy.js";
import {
  audioInit,
  toggleMute,
  isMuted,
  playCoinPop,
  playBatchReady,
  playDayEnd,
  playButtonTick,
  MUTE_KEY,
} from "./audio.js";

// LORE_LOADED_COUNT removed — denominator is now computed dynamically in updateHUD()
// based on state.dayNumber and LORE_TIER_DAY_GATE (honest: shows unlocked pool size).
import {
  DAY_DURATION_SECONDS,
  DEFAULT_SELL_PRICE,
  PRICE_MIN,
  PRICE_MAX,
  BATCH_MIN_LBS,
  BATCH_MAX_LBS,
  RAW_PEANUT_BASE_PRICE,
  RECIPES,
  RECIPE_UNLOCK_THRESHOLD,
  bulkDiscountFor,
  SIM_TIME_SCALE,
  ROASTER_TIER_ORDER,
  ROASTER_UPGRADE_COST,
  MAX_QUEUE_SLOTS,
  QUEUE_SLOT_COST,
  STARTING_QUEUE_SLOTS,
  DAY_NAMES,
  DAY_FACTOR,
  type RecipeId,
  type RoasterTier,
} from "../data/economy.js";
import { LORE_LINES, LORE_TIER_DAY_GATE } from "../data/lore.js";

// ---------------------------------------------------------------------------
// Palette A constants (integers for Phaser's 0xRRGGBB format)
// ---------------------------------------------------------------------------

const P = {
  PANEL_BG:     0xF5DEB3,
  PANEL_BORDER: 0x8B6F47,
  TEXT:         0x2C2416,
  CASH_GREEN:   0x4A7C4E,
  WARNING_RED:  0xC0392B,
  TRUCK_BODY:   0x8B6F47,
  TRUCK_TRIM:   0xF5DEB3,
  TRUCK_WINDOW: 0x2C2416,
  WHEELS:       0x333333,
  GROUND:       0x7CB342,
  SKY:          0xFFFFCC,
  AWNING:       0xFF9800,
  STALL:        0x8B6F47,
  TREE:         0x556B2F,
  SLOT_EMPTY:   0xCCCCCC,
  SLOT_ROAST:   0xFF9800,
  SLOT_READY:   0x7CB342,
  COIN_GOLD:    0xFFD700,
  NPC_SKIN:     0xE8D4B0,
  NPC_SHIRT_A:  0x5A7A8A,  // Legume Lecturer
  NPC_SHIRT_B:  0xA0522D,  // Concerned Parent
  NPC_SUIT:     0x1C3A47,  // Office Worker
  SMOKE:        0xE8E8E8,
  MODAL_SHADOW: 0x000000,
} as const;

// Text style presets (matches P1_SPRITE_SPEC: min 14pt readable)
const TEXT_STYLE_BODY: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "9px",
  color: "#2C2416",
  fontFamily: "monospace",
};
const TEXT_STYLE_LABEL: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "8px",
  color: "#2C2416",
  fontFamily: "monospace",
};
const TEXT_STYLE_HEADER: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "10px",
  color: "#2C2416",
  fontFamily: "monospace",
  fontStyle: "bold",
};
const TEXT_STYLE_GREEN: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "9px",
  color: "#4A7C4E",
  fontFamily: "monospace",
};
const TEXT_STYLE_RED: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "9px",
  color: "#C0392B",
  fontFamily: "monospace",
};

// ---------------------------------------------------------------------------
// Coin pop animation helper (fires on each sale event)
// ---------------------------------------------------------------------------

interface CoinPop {
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  life: number; // seconds remaining
}

// ---------------------------------------------------------------------------
// Gag speech-bubble (two-beat: customer line → owner reply → auto-dismiss)
// ---------------------------------------------------------------------------

interface GagBubble {
  bg: Phaser.GameObjects.Rectangle;
  tail: Phaser.GameObjects.Triangle;
  customerLine: Phaser.GameObjects.Text;
  ownerLine: Phaser.GameObjects.Text;
  timerEvent: Phaser.Time.TimerEvent;   // tracked per F11 rule
}

// ---------------------------------------------------------------------------
// NPC data (3 ambient customers walk left/right near truck)
// ---------------------------------------------------------------------------

interface NpcData {
  x: number;
  y: number;
  dir: number;          // +1 or -1
  speed: number;        // px per second
  colorBody: number;
  colorShirt: number;
  rect: Phaser.GameObjects.Rectangle;
  head: Phaser.GameObjects.Rectangle;
}

// ---------------------------------------------------------------------------
// GameScene
// ---------------------------------------------------------------------------

export class GameScene extends Phaser.Scene {
  private state!: SimState;

  // ---- HUD text refs (updated each frame via updateHUD) --------------------
  private txtCash!: Phaser.GameObjects.Text;
  private txtDay!: Phaser.GameObjects.Text;
  private txtDayOfWeek!: Phaser.GameObjects.Text;  // W4: day-of-week label
  private txtRawStock!: Phaser.GameObjects.Text;
  private txtRoastedStock!: Phaser.GameObjects.Text;
  private txtPrice!: Phaser.GameObjects.Text;
  private txtDemandHint!: Phaser.GameObjects.Text;
  private txtDayProgress!: Phaser.GameObjects.Text;

  // ---- Roast slot UI (P1 has STARTING_QUEUE_SLOTS = 1) -------------------
  private slotRects: Phaser.GameObjects.Rectangle[] = [];
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private slotBars: Phaser.GameObjects.Rectangle[] = [];
  private slotBarBgs: Phaser.GameObjects.Rectangle[] = [];

  // ---- Smoke wisps (scale with active roasts) ----------------------------
  private smokeCircles: Phaser.GameObjects.Arc[] = [];

  // ---- Coin pops (sale feedback) -----------------------------------------
  private coinPops: CoinPop[] = [];

  // ---- Ambient NPC data --------------------------------------------------
  private npcs: NpcData[] = [];

  // ---- Smoke animation counter -------------------------------------------
  private smokeTimer = 0;

  // ---- Coin-pop accumulator (F5: batch per ≥$0.50, not per tick) ----------
  private coinPopAccum = 0;
  private readonly COIN_POP_THRESHOLD = 0.50;

  // ---- Modal state --------------------------------------------------------
  private modalGroup?: Phaser.GameObjects.Group;
  private supplyModalRefreshEvent?: Phaser.Time.TimerEvent;  // F11: track to remove cleanly
  private reportGroup?: Phaser.GameObjects.Group;
  private supplyModalOpen = false;
  private reportOpen = false;

  // ---- Recipe/Batch modal state ------------------------------------------
  private roastModalGroup?: Phaser.GameObjects.Group;
  private roastModalOpen = false;
  private roastModalSlotIndex = 0;
  private roastModalRecipe: RecipeId = "classic_salted";
  private roastModalBatchLbs = 10;

  // ---- Upgrades modal state (Wave 4) -------------------------------------
  private upgradesModalGroup?: Phaser.GameObjects.Group;
  private upgradesModalOpen = false;

  // ---- Rescue arc modal state (Wave 5) ------------------------------------
  private rescueModalGroup?: Phaser.GameObjects.Group;
  private rescueModalOpen = false;
  /** HUD chip showing active debt/obligation status. */
  private rescueHudChip?: Phaser.GameObjects.Text;

  // ---- Supply modal working qty -------------------------------------------
  private supplyQty = 50; // default qty for supply modal

  // ---- Price step size ----------------------------------------------------
  private readonly PRICE_STEP = 0.05;

  // ---- Lore counter HUD (Wave 2) ------------------------------------------
  private txtLoreCounter!: Phaser.GameObjects.Text;

  // ---- Active gag speech bubble (at most one at a time) -------------------
  private gagBubble?: GagBubble;

  // ---- Tutorial state (Wave 3) --------------------------------------------
  // Three-step first-run tutorial (only when no save exists).
  // State is gated by "dmn_tutorial_seen" in localStorage (parallel key —
  // does not touch the save envelope so existing persistence tests are safe).
  // Each step advances on the relevant action or on tap-to-skip.
  // Steps: 0=buy peanuts, 1=start roast, 2=watch report. After step 2 the
  // tutorial is marked seen and never shown again. DARK_PATTERN_GATE A.6
  // compliant: no nagging repeats, never blocks input.
  private tutorialStep = -1;        // -1 = not active (already seen or has save)
  private tutorialGroup?: Phaser.GameObjects.Group;

  /** localStorage key for tutorial-seen flag (separate from save envelope). */
  private readonly TUTORIAL_KEY = "dmn_tutorial_seen";

  // ---- Mute button (Wave 3) -----------------------------------------------
  private muteBtn?: Phaser.GameObjects.Rectangle;
  private muteBtnLabel?: Phaser.GameObjects.Text;

  // ---- Supply button reference (for tutorial pointer) ---------------------
  private buyBtnRef?: Phaser.GameObjects.Rectangle;

  // ---- Persistence ---------------------------------------------------------
  /** Cumulative wall-clock seconds while this scene has been visible. */
  private playtimeSeconds = 0;
  /** W1: safe storage proxy (localStorage or in-memory fallback). */
  private storage = safeStorage();
  /** W8: fire the save-failure toast at most once per session. */
  private saveFailed = false;
  /** Bound reference so the same function can be removed in shutdown(). */
  private readonly onVisibilityChange: () => void = () => {
    if (document.visibilityState === "hidden") {
      this.saveGame();
    }
  };
  private readonly onPageHide: () => void = () => {
    this.saveGame();
  };

  constructor() {
    super({ key: "GameScene" });
  }

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  create(): void {
    const W = this.scale.width;   // 480
    const H = this.scale.height;  // 270

    // ---- Load save (§4 load path) ----------------------------------------
    // W1: use safeStorage() so blocked localStorage degrades to in-memory.
    this.storage = safeStorage();
    const loadResult = tryLoad(this.storage);
    this.state = loadResult.state;

    if (loadResult.errorMessage) {
      // Corruption toast — warm, non-blaming (spec §7)
      this.time.delayedCall(400, () => this.showToast(loadResult.errorMessage!));
    }
    if (loadResult.offlineMessage) {
      // Offline earnings toast — gain-framed (DARK_PATTERN_GATE §A.8 / spec §8 Q8)
      this.time.delayedCall(600, () => this.showToast(loadResult.offlineMessage!));
    }

    // ---- Register save-on-hide listeners (spec §3) -----------------------
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("pagehide", this.onPageHide);
    // W4: register cleanup via SHUTDOWN event (Phaser calls this; shutdown() is dead code).
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      window.removeEventListener("pagehide", this.onPageHide);
      this.dismissTutorial();
    });


    // ---- Backdrop (District: Farmers' Market) — P1_SPRITE_SPEC #10 --------
    // Sky: top 130 px, #FFFFCC
    this.add.rectangle(W / 2, 65, W, 130, P.SKY);
    // Ground: bottom 140 px, #7CB342
    this.add.rectangle(W / 2, 195, W, 140, P.GROUND);

    // Market stall (mid-left) — 80×60 px brown rect + orange awning bar
    this.add.rectangle(80, 160, 80, 60, P.STALL);
    this.add.rectangle(80, 131, 80, 4, P.AWNING);

    // Tree circles (dark green #556B2F, 24–40 px diameter, background)
    this.add.circle(30, 100, 18, P.TREE);
    this.add.circle(440, 90, 22, P.TREE);
    this.add.circle(390, 110, 14, P.TREE);

    // ---- Truck (P1_SPRITE_SPEC #1) — 96×64 px, programmer art ------------
    const truckX = W / 2 + 60;
    const truckY = 195;

    // Body: #8B6F47
    this.add.rectangle(truckX, truckY - 16, 96, 48, P.TRUCK_BODY);
    // Trim bar (roof): #F5DEB3
    this.add.rectangle(truckX, truckY - 40, 96, 6, P.TRUCK_TRIM);
    // Cabin (right side): slightly darker
    this.add.rectangle(truckX + 26, truckY - 20, 44, 36, 0xA0844E);
    // Window (serving): #2C2416
    this.add.rectangle(truckX - 18, truckY - 20, 24, 18, P.TRUCK_WINDOW);
    // Wheels: #333333, circles 10 px radius
    this.add.circle(truckX - 32, truckY + 8, 10, P.WHEELS);
    this.add.circle(truckX + 32, truckY + 8, 10, P.WHEELS);

    // Legsy painted on the truck side panel (programmer-art; code-drawn).
    // Scale 0.6 keeps it inside the panel (~19×29 px visible on the side).
    drawLegsy(this, truckX + 16, truckY - 1, 0.6);

    // ---- Smoke wisps (P1_SPRITE_SPEC #2) — circles above truck ------------
    // 3 wisps; opacity / position animated in update()
    for (let i = 0; i < 3; i++) {
      const c = this.add.circle(truckX - 10 + i * 6, truckY - 50 - i * 8, 5, P.SMOKE);
      c.setAlpha(0);
      this.smokeCircles.push(c);
    }

    // ---- NPC ambient customers (P1_SPRITE_SPEC #6, #7, #8) ----------------
    // Three archetypes: Legume Lecturer (tall/thin), Concerned Parent (short/wide), Office Worker (narrow/suit)
    const npcDefs: Array<{ x: number; y: number; colorBody: number; colorShirt: number; w: number; h: number }> = [
      { x: 200, y: 200, colorBody: P.NPC_SKIN, colorShirt: P.NPC_SHIRT_A, w: 8, h: 16 }, // Lecturer
      { x: 260, y: 205, colorBody: P.NPC_SKIN, colorShirt: P.NPC_SHIRT_B, w: 10, h: 14 }, // Parent
      { x: 320, y: 202, colorBody: P.NPC_SKIN, colorShirt: P.NPC_SUIT,   w: 6,  h: 15 }, // Worker
    ];

    for (const def of npcDefs) {
      const shirt = this.add.rectangle(def.x, def.y, def.w, def.h, def.colorShirt);
      const head  = this.add.rectangle(def.x, def.y - def.h / 2 - 5, 7, 8, def.colorBody);
      this.npcs.push({
        x: def.x, y: def.y,
        dir: Math.random() > 0.5 ? 1 : -1,
        speed: 15 + Math.random() * 10,
        colorBody: def.colorBody,
        colorShirt: def.colorShirt,
        rect: shirt,
        head: head,
      });
    }

    // ---- HUD top bar -------------------------------------------------------
    // Background strip
    this.add.rectangle(W / 2, 8, W, 16, P.PANEL_BORDER);

    this.txtDay = this.add.text(6, 2, "Day 1", {
      ...TEXT_STYLE_BODY, color: "#F5DEB3",
    });

    // W4: day-of-week label (predictable, visible — DARK_PATTERN_GATE §A.1 compliant)
    this.txtDayOfWeek = this.add.text(48, 2, "Monday", {
      ...TEXT_STYLE_LABEL, color: "#C0A060",
    });

    this.add.text(W / 2, 2, "FARMERS' MARKET", {
      ...TEXT_STYLE_LABEL, color: "#FF9800",
    }).setOrigin(0.5, 0);

    this.txtCash = this.add.text(W - 6, 2, "Cash: $50.00", {
      ...TEXT_STYLE_BODY, color: "#FFD700",
    }).setOrigin(1, 0);

    // ---- Lore counter (Wave 2: collection tease, no pressure framing) -------
    // Positioned below the top bar at the right edge; visible but unobtrusive.
    // Denominator = unlocked pool size (honest; grows with dayNumber tier gates).
    this.txtLoreCounter = this.add.text(W - 6, 18, "Lore: 0/6", {
      ...TEXT_STYLE_LABEL, color: "#C0A060",
    }).setOrigin(1, 0);

    // ---- Rescue arc HUD chip (Wave 5) — neutral framing, visible while debt/obligation active --
    // Positioned below the lore counter; hidden when no active debt.
    this.rescueHudChip = this.add.text(W - 6, 28, "", {
      fontSize: "6px", color: "#8B6F47", fontFamily: "monospace",
    }).setOrigin(1, 0).setVisible(false);

    // ---- Roast Queue Panel (P1_SPRITE_SPEC #13) ----------------------------
    // Panel: 160×80 px, top-left area at x=5, y=20
    const qX = 5, qY = 20;
    const qW = 160, qH = 80;
    this.add.rectangle(qX + qW / 2, qY + qH / 2, qW, qH, P.PANEL_BG)
      .setStrokeStyle(1, P.PANEL_BORDER);
    this.add.text(qX + 4, qY + 3, "ROAST QUEUE", TEXT_STYLE_HEADER);

    // Slot buttons (1 slot in P1; click to start roast)
    const numSlots = this.state.roastSlots.length;
    for (let i = 0; i < numSlots; i++) {
      const sx = qX + 5;
      const sy = qY + 18 + i * 30;
      const sw = 150, sh = 24;

      // Slot background rect (status color updated in updateHUD)
      const slotRect = this.add.rectangle(sx + sw / 2, sy + sh / 2, sw, sh, P.SLOT_EMPTY)
        .setStrokeStyle(1, P.PANEL_BORDER)
        .setInteractive({ cursor: "pointer" });

      // Progress bar background
      const barBg = this.add.rectangle(sx + 3 + 70, sy + sh / 2 + 6, 74, 5, 0xAAAAAA);
      barBg.setVisible(false);

      // Progress bar foreground
      const bar = this.add.rectangle(sx + 3 + 33, sy + sh / 2 + 6, 0, 5, P.SLOT_ROAST);
      bar.setVisible(false);

      // Slot label text
      const slotLabel = this.add.text(sx + 3, sy + 3, `Slot ${i + 1}: [Empty] — tap to roast`, TEXT_STYLE_LABEL);

      this.slotRects.push(slotRect);
      this.slotLabels.push(slotLabel);
      this.slotBars.push(bar);
      this.slotBarBgs.push(barBg);

      const slotIndex = i;
      slotRect.on("pointerdown", () => {
        if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.rescueModalOpen) {
          this.advanceTutorialOnAction(1); // step 1: "start a roast"
          this.handleSlotClick(slotIndex);
        }
      });
      slotRect.on("pointerover", () => slotRect.setAlpha(0.85));
      slotRect.on("pointerout",  () => slotRect.setAlpha(1.0));
    }

    // ---- Inventory strip ---------------------------------------------------
    const invY = qY + qH + 3;
    this.add.rectangle(qX + qW / 2, invY + 10, qW, 20, P.PANEL_BG)
      .setStrokeStyle(1, P.PANEL_BORDER);
    this.txtRawStock     = this.add.text(qX + 4, invY + 3, "Raw: 20 lbs", TEXT_STYLE_LABEL);
    this.txtRoastedStock = this.add.text(qX + 84, invY + 3, "Roasted: 0 lbs", TEXT_STYLE_LABEL);

    // ---- Price control panel -----------------------------------------------
    // Right-side panel: x=330, y=20, 145×80
    const pX = 330, pY = 20;
    const pW = 145, pH = 86;
    this.add.rectangle(pX + pW / 2, pY + pH / 2, pW, pH, P.PANEL_BG)
      .setStrokeStyle(1, P.PANEL_BORDER);
    this.add.text(pX + 4, pY + 3, "PRICE / LB", TEXT_STYLE_HEADER);

    this.txtPrice = this.add.text(pX + 4, pY + 16, `$${DEFAULT_SELL_PRICE.toFixed(2)}`, {
      ...TEXT_STYLE_BODY, fontSize: "11px",
    });

    // Minus button
    const btnMinus = this.add.rectangle(pX + 16, pY + 35, 22, 16, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(pX + 16, pY + 35, "–", { fontSize: "10px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5);
    btnMinus.on("pointerdown", () => { if (!this.reportOpen) { playButtonTick(); this.adjustPrice(-this.PRICE_STEP); } });
    btnMinus.on("pointerover", () => btnMinus.setAlpha(0.8));
    btnMinus.on("pointerout",  () => btnMinus.setAlpha(1.0));

    // Plus button
    const btnPlus = this.add.rectangle(pX + 46, pY + 35, 22, 16, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(pX + 46, pY + 35, "+", { fontSize: "10px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5);
    btnPlus.on("pointerdown", () => { if (!this.reportOpen) { playButtonTick(); this.adjustPrice(+this.PRICE_STEP); } });
    btnPlus.on("pointerover", () => btnPlus.setAlpha(0.8));
    btnPlus.on("pointerout",  () => btnPlus.setAlpha(1.0));

    // Range hint
    this.add.text(pX + 72, pY + 29, `$${PRICE_MIN}–$${PRICE_MAX}`, TEXT_STYLE_LABEL);

    // Demand hint (updates with price)
    this.txtDemandHint = this.add.text(pX + 4, pY + 50, "", TEXT_STYLE_LABEL);

    // Margin hint
    this.add.text(pX + 4, pY + 74, "HEALTHY >60%", { ...TEXT_STYLE_LABEL, color: "#4A7C4E" });

    // ---- Supply BUY button -------------------------------------------------
    const buyBtnX = pX + 4, buyBtnY = pY + pH + 5;
    const buyBtn = this.add.rectangle(buyBtnX + 68, buyBtnY + 10, 137, 20, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.buyBtnRef = buyBtn; // held for tutorial pointer targeting
    this.add.text(buyBtnX + 68, buyBtnY + 10, "BUY RAW PEANUTS", {
      fontSize: "8px", color: "#2C2416", fontFamily: "monospace",
    }).setOrigin(0.5);
    buyBtn.on("pointerdown", () => {
      if (!this.reportOpen && !this.rescueModalOpen) {
        this.advanceTutorialOnAction(0); // step 0: "buy raw peanuts"
        this.openSupplyModal();
      }
    });
    buyBtn.on("pointerover", () => buyBtn.setAlpha(0.85));
    buyBtn.on("pointerout",  () => buyBtn.setAlpha(1.0));

    // ---- UPGRADES button (Wave 4: capital-investment teaching surface) -----
    const upgBtnY = buyBtnY + 24;
    const upgradesBtn = this.add.rectangle(buyBtnX + 68, upgBtnY + 10, 137, 20, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(buyBtnX + 68, upgBtnY + 10, "UPGRADES", {
      fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace",
    }).setOrigin(0.5);
    upgradesBtn.on("pointerdown", () => {
      if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.rescueModalOpen) {
        this.openUpgradesModal();
      }
    });
    upgradesBtn.on("pointerover", () => upgradesBtn.setAlpha(0.85));
    upgradesBtn.on("pointerout",  () => upgradesBtn.setAlpha(1.0));

    // ---- Day progress bar --------------------------------------------------
    const dpY = H - 18;
    this.add.rectangle(W / 2, dpY + 5, W, 18, P.PANEL_BORDER);
    this.add.text(6, dpY, "Day progress:", TEXT_STYLE_LABEL).setStyle({ color: "#F5DEB3" });
    this.txtDayProgress = this.add.text(100, dpY, "0%  6am", TEXT_STYLE_LABEL).setStyle({ color: "#F5DEB3" });

    // End-of-day button (manual trigger for testing — day also ends when clock fills)
    const endBtn = this.add.rectangle(W - 50, dpY + 5, 88, 14, 0x556644)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(W - 50, dpY + 5, "END DAY", { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5);
    endBtn.on("pointerdown", () => { if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.rescueModalOpen) this.triggerEndOfDay(); });

    // ---- Reset Save button (spec req; tucked in bottom-left corner) --------
    // Player-initiated only — confirm dialog prevents accidents. (DARK_PATTERN_GATE §B.3)
    const resetBtn = this.add.rectangle(28, dpY + 5, 48, 14, 0x664444)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(28, dpY + 5, "RESET", { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5);
    resetBtn.on("pointerdown", () => {
      if (this.reportOpen || this.supplyModalOpen || this.roastModalOpen || this.upgradesModalOpen || this.rescueModalOpen) return;
      this.showResetConfirm();
    });

    // Initial HUD render
    this.updateHUD();

    // ---- Mute button (Wave 3 — persisted preference) ----------------------
    // Placed in the bottom-right corner of the HUD bar (next to END DAY).
    // Mute preference is read from localStorage via audio module.
    const dpY2 = H - 18;
    const muteX = W - 96; // between END DAY and the right edge
    this.muteBtn = this.add.rectangle(muteX, dpY2 + 5, 30, 14, 0x445566)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.muteBtnLabel = this.add.text(muteX, dpY2 + 5,
      isMuted() ? "UN-MUTE" : "MUTE",
      { fontSize: "6px", color: "#F5DEB3", fontFamily: "monospace" }
    ).setOrigin(0.5);
    this.muteBtn.on("pointerdown", () => {
      audioInit(this.storage);
      const nowMuted = toggleMute(this.storage);
      if (this.muteBtnLabel) {
        this.muteBtnLabel.setText(nowMuted ? "UN-MUTE" : "MUTE");
      }
    });
    this.muteBtn.on("pointerover", () => this.muteBtn?.setAlpha(0.85));
    this.muteBtn.on("pointerout",  () => this.muteBtn?.setAlpha(1.0));

    // Initialise audio prefs from storage (won't play anything — just reads mute flag)
    // Actual AudioContext creation is deferred to first pointer-down (browser policy).
    const savedMute = this.storage.getItem(MUTE_KEY);
    if (savedMute !== null && this.muteBtnLabel) {
      // Reflect persisted state (audioInit not yet called, but we can read the key)
      const persisted = savedMute === "1";
      this.muteBtnLabel.setText(persisted ? "UN-MUTE" : "MUTE");
    }

    // ---- First-run tutorial init (Wave 3) ---------------------------------
    // Only show tutorial if no save existed at load time (fresh player).
    // Uses a parallel storage key so save schema is untouched.
    if (!loadResult.ok && this.storage.getItem(this.TUTORIAL_KEY) === null) {
      // Short delay so the backdrop finishes rendering before the first bubble
      this.time.delayedCall(400, () => this.showTutorialStep(0));
    }
  }

  // ---------------------------------------------------------------------------
  // update — Phaser game loop
  // ---------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    // Track wall-clock playtime (excludes offline time; used by trySave meta)
    this.playtimeSeconds += delta / 1_000;

    if (this.reportOpen || this.supplyModalOpen || this.roastModalOpen || this.upgradesModalOpen || this.rescueModalOpen) return;

    // Convert Phaser ms delta to simulated seconds.
    // SIM_TIME_SCALE = 60: 1 real second = 60 sim seconds → 1 sim hour = 60 real seconds.
    const dtSeconds = (delta / 1_000) * SIM_TIME_SCALE;

    const prevDayElapsed = this.state.dayElapsedSeconds;
    const events = tick(this.state, dtSeconds);

    // Handle events for coin pops, gag bubbles, and day-end trigger.
    // F5: accumulate revenue; spawn one pop per COIN_POP_THRESHOLD earned.
    // Item 1: trySave on batch_ready — closes the crash-loss window between
    //         roast completion and end-of-day save (cheap; no UI noise on success).
    for (const ev of events) {
      if (ev.kind === "sale") {
        this.coinPopAccum += ev.detail.revenue as number;
      }
      if (ev.kind === "gag") {
        this.showGagBubble(ev.detail.loreId as string);
      }
      if (ev.kind === "batch_ready") {
        playBatchReady();
        this.saveGame();
      }
    }
    if (this.coinPopAccum >= this.COIN_POP_THRESHOLD) {
      this.spawnCoinPop(this.coinPopAccum);
      playCoinPop();
      this.coinPopAccum = 0;
    }

    // Day ended (clock just passed DAY_DURATION_SECONDS)
    if (
      prevDayElapsed < DAY_DURATION_SECONDS &&
      this.state.dayElapsedSeconds >= DAY_DURATION_SECONDS
    ) {
      this.triggerEndOfDay();
    }

    // Animate NPCs
    this.animateNpcs(dtSeconds);

    // Animate smoke wisps
    this.animateSmoke(dtSeconds);

    // Tick coin pops
    this.tickCoinPops(dtSeconds);

    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // HUD update — reads state, pushes to text objects
  // ---------------------------------------------------------------------------

  private updateHUD(): void {
    // Compute unlocked lore pool size (denominator for collection counter).
    const unlockedLoreCount = LORE_LINES.filter(
      (l) => this.state.dayNumber >= LORE_TIER_DAY_GATE[l.tier]
    ).length;
    this.txtCash.setText(`Cash: $${this.state.cash.toFixed(2)}`);
    this.txtDay.setText(`Day ${this.state.dayNumber}`);
    // W4: day-of-week label (predictable, never framed as pressure — DARK_PATTERN_GATE §A.1)
    const dowIdx = ((this.state.dayNumber - 1) % 7 + 7) % 7;
    const dayFactor = DAY_FACTOR[dowIdx];
    const dowLabel = DAY_NAMES[dowIdx];
    // Show factor as a neutral context hint (not "peak!" or "slow day!")
    this.txtDayOfWeek.setText(`${dowLabel} (×${dayFactor.toFixed(2)})`);
    this.txtLoreCounter.setText(`Lore: ${this.state.gagsSeen.size}/${unlockedLoreCount}`);
    this.txtRawStock.setText(`Raw: ${this.state.rawStockLbs.toFixed(1)} lbs`);
    this.txtRoastedStock.setText(`Roasted: ${this.state.roastedStockLbs.toFixed(1)} lbs`);
    this.txtPrice.setText(`$${this.state.sellPrice.toFixed(2)}`);

    // Demand hint at current price
    const demandLbsHr = projectedDemand(this.state.sellPrice);
    // F7: derive COGS from economy constants, not a hardcoded literal
    const cogsPerLbClassic = RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb;
    const marginPct = this.state.sellPrice > 0
      ? ((this.state.sellPrice - cogsPerLbClassic) / this.state.sellPrice) * 100
      : 0;
    const marginColor = marginPct >= 60 ? "#4A7C4E" : marginPct >= 45 ? "#C08A00" : "#C0392B";
    this.txtDemandHint.setText(
      `~${demandLbsHr.toFixed(0)} lbs/hr  margin ${marginPct.toFixed(0)}%`
    ).setStyle({ ...TEXT_STYLE_LABEL, color: marginColor });

    // Day progress
    const pct = Math.min(100, (this.state.dayElapsedSeconds / DAY_DURATION_SECONDS) * 100);
    // 6am + elapsed hours
    const hoursElapsed = this.state.dayElapsedSeconds / 3600;
    const hour = Math.floor(6 + hoursElapsed);
    const ampm = hour < 12 ? "am" : "pm";
    const displayHour = hour <= 12 ? hour : hour - 12;
    this.txtDayProgress.setText(`${pct.toFixed(0)}%  ${displayHour}${ampm}`);

    // Update roast slots
    for (let i = 0; i < this.state.roastSlots.length; i++) {
      const slot = this.state.roastSlots[i];
      const rect = this.slotRects[i];
      const label = this.slotLabels[i];
      const bar   = this.slotBars[i];
      const barBg = this.slotBarBgs[i];

      if (slot.status === "empty") {
        rect.setFillStyle(P.SLOT_EMPTY);
        label.setText(`Slot ${i + 1}: [Empty] — tap to roast`).setStyle(TEXT_STYLE_LABEL);
        bar.setVisible(false);
        barBg.setVisible(false);
      } else if (slot.status === "roasting") {
        rect.setFillStyle(P.SLOT_ROAST);
        // F3: secondsRemaining is in sim-time; divide by SIM_TIME_SCALE for real-time display
        const realSecsLeft = Math.ceil(slot.secondsRemaining / SIM_TIME_SCALE);
        const progress = 1 - slot.secondsRemaining / Math.max(1, slot.totalSeconds);
        label.setText(`Slot ${i + 1}: ${slot.batchLbs}lb roasting… ${realSecsLeft}s left`).setStyle(TEXT_STYLE_LABEL);
        barBg.setVisible(true);
        bar.setVisible(true);
        // Bar width 0–66 px
        const barW = Math.max(0, progress * 66);
        bar.setSize(barW, 5);
        // Reposition bar origin (left-anchored)
        const slotRect = this.slotRects[i];
        bar.setPosition(slotRect.x - 75 + barW / 2, slotRect.y + 8);
        barBg.setPosition(slotRect.x - 75 + 33, slotRect.y + 8);
      } else if (slot.status === "ready") {
        rect.setFillStyle(P.SLOT_READY);
        label.setText(`Slot ${i + 1}: ${slot.batchLbs}lb READY ✓`).setStyle({ ...TEXT_STYLE_LABEL, color: "#2C6624" });
        bar.setVisible(false);
        barBg.setVisible(false);
      }
    }

    // Low-stock warning on raw peanuts (text color shift)
    if (this.state.rawStockLbs < 5) {
      this.txtRawStock.setStyle({ ...TEXT_STYLE_LABEL, color: "#C0392B" });
    } else {
      this.txtRawStock.setStyle(TEXT_STYLE_LABEL);
    }

    // Wave 5: rescue arc HUD chip — neutral, factual, never shaming
    if (this.rescueHudChip) {
      const chipText = this.buildRescueHudChipText();
      if (chipText) {
        this.rescueHudChip.setText(chipText).setVisible(true);
      } else {
        this.rescueHudChip.setVisible(false);
      }
    }
  }

  /** Build a short HUD chip string for active debts/obligations. Neutral framing. */
  private buildRescueHudChipText(): string | null {
    const parts: string[] = [];
    for (const debt of this.state.rescueDebts) {
      const daysLeft = debt.dueDayNumber - this.state.dayNumber;
      if (debt.kind === "loan") {
        parts.push(`Owe Old Joe $${debt.amountDue.toFixed(2)} — ${daysLeft}d left`);
      } else if (debt.kind === "credit") {
        parts.push(`Supplier: owe $${debt.amountDue.toFixed(2)} — ${daysLeft}d left`);
      } else if (debt.kind === "payday") {
        const rNote = debt.rollovers > 0 ? ` [×${debt.rollovers}]` : "";
        parts.push(`QuickNut: $${debt.amountDue.toFixed(2)} due d${debt.dueDayNumber}${rNote}`);
      }
    }
    if (this.state.preorderObligation) {
      const ob = this.state.preorderObligation;
      const daysLeft = ob.dueDayNumber - this.state.dayNumber;
      parts.push(`Derek: ${ob.fulfilledLbs.toFixed(0)}/${ob.totalLbs}lbs — ${daysLeft}d left`);
    }
    return parts.length > 0 ? parts.join(" | ") : null;
  }

  // ---------------------------------------------------------------------------
  // Price adjustment
  // ---------------------------------------------------------------------------

  private adjustPrice(delta: number): void {
    const newPrice = Math.round((this.state.sellPrice + delta) * 100) / 100;
    setPrice(this.state, newPrice);
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // Slot click → start roast (if empty) or dismiss ready slot
  // ---------------------------------------------------------------------------

  private handleSlotClick(slotIndex: number): void {
    const slot = this.state.roastSlots[slotIndex];
    if (slot.status === "empty") {
      if (this.state.rawStockLbs < BATCH_MIN_LBS) {
        this.showToast("No raw stock — buy peanuts first!");
        return;
      }
      // Open recipe/batch selection modal (P1.5 spec §2)
      this.openRoastModal(slotIndex);
    } else if (slot.status === "ready") {
      // Dismiss the "ready" visual — stock already added to roastedStockLbs on ready event
      // No state change needed; batch sits until end of day naturally
      this.showToast(`${slot.batchLbs} lbs ready — selling automatically!`);
    }
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // Roast modal — Recipe/Batch selection (RECIPE_BATCH_UI.md §2)
  // ---------------------------------------------------------------------------

  private openRoastModal(slotIndex: number): void {
    if (this.roastModalOpen) return;
    this.roastModalOpen = true;
    this.roastModalSlotIndex = slotIndex;
    this.roastModalRecipe = "classic_salted";
    this.roastModalBatchLbs = Math.min(10, this.state.rawStockLbs, BATCH_MAX_LBS);
    if (this.roastModalBatchLbs < BATCH_MIN_LBS) this.roastModalBatchLbs = BATCH_MIN_LBS;

    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 300, mH = 220;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    this.roastModalGroup = this.add.group();

    // Backdrop
    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.55)
      .setInteractive();
    this.roastModalGroup.add(backdrop);

    // Panel
    const panel = this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
      .setStrokeStyle(2, P.PANEL_BORDER);
    this.roastModalGroup.add(panel);

    // Header
    this.roastModalGroup.add(
      this.add.text(mX + 6, mY + 6, `ROAST SLOT ${slotIndex + 1}`, TEXT_STYLE_HEADER)
    );

    // Close button [×]
    const closeBtn = this.add.rectangle(mX + mW - 12, mY + 10, 16, 14, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.roastModalGroup.add(closeBtn);
    this.roastModalGroup.add(
      this.add.text(mX + mW - 12, mY + 10, "×", { fontSize: "10px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    closeBtn.on("pointerdown", () => this.closeRoastModal());

    // Divider
    this.roastModalGroup.add(this.add.rectangle(mX + mW / 2, mY + 20, mW - 8, 1, P.PANEL_BORDER));

    // ---- Recipe section ----
    this.roastModalGroup.add(this.add.text(mX + 6, mY + 24, "RECIPE", TEXT_STYLE_LABEL));

    const RECIPE_IDS: RecipeId[] = ["classic_salted", "honey_cinnamon", "ghost_pepper"];
    const RECIPE_DISPLAY: Record<RecipeId, string> = {
      classic_salted: "Classic Salted",
      honey_cinnamon: "Honey Cinnamon",
      ghost_pepper:   "Ghost Pepper",
    };

    // Recipe row y-positions
    const recipeRowY: Record<RecipeId, number> = {
      classic_salted: mY + 34,
      honey_cinnamon: mY + 46,
      ghost_pepper:   mY + 58,
    };

    // Radio-style indicator circles (filled when selected)
    const radioCircles: Record<RecipeId, Phaser.GameObjects.Arc> = {} as Record<RecipeId, Phaser.GameObjects.Arc>;

    const cogsForRecipe = (id: RecipeId): number =>
      RAW_PEANUT_BASE_PRICE + RECIPES[id].ingredientCostPerLb;

    // Preview text objects (updated on recipe/batch change)
    const previewLines: Phaser.GameObjects.Text[] = [];

    const refreshPreview = (): void => {
      const cogs = cogsForRecipe(this.roastModalRecipe);
      const cogsTotal = cogs * this.roastModalBatchLbs;
      const roastMins = (RECIPES[this.roastModalRecipe].roastSecondsPerLbTinPan * this.roastModalBatchLbs) / 60;

      // Row A: at current price
      const curPrice  = this.state.sellPrice;
      const margin1   = curPrice > 0 ? ((curPrice - cogs) / curPrice) * 100 : 0;
      const demand1   = projectedDemand(curPrice, this.roastModalRecipe);
      const marginColor = margin1 >= 60 ? "#4A7C4E" : margin1 >= 45 ? "#C08A00" : "#C0392B";

      // Row B: at optimum price (item 6 — two-row preview)
      const optPrice  = optimumPrice(this.roastModalRecipe);
      const marginOpt = optPrice > 0 ? ((optPrice - cogs) / optPrice) * 100 : 0;
      const demandOpt = projectedDemand(optPrice, this.roastModalRecipe);

      if (previewLines.length >= 5) {
        previewLines[0].setText(`COGS total: $${cogsTotal.toFixed(2)}  Roast: ${roastMins.toFixed(0)} min (sim)`);
        previewLines[1].setText(`at current $${curPrice.toFixed(2)}: margin ${margin1.toFixed(0)}%  ~${demand1.toFixed(0)} lbs/hr`);
        previewLines[1].setStyle({ ...TEXT_STYLE_LABEL, color: marginColor });
        previewLines[2].setText(`at optimum $${optPrice.toFixed(2)}: margin ${marginOpt.toFixed(0)}%  ~${demandOpt.toFixed(0)} lbs/hr`);
        previewLines[2].setStyle({ ...TEXT_STYLE_LABEL, color: "#4A7C4E" });
        previewLines[3].setText(`COGS/lb: $${cogs.toFixed(2)}`);
      }

      // Update radio circles
      for (const id of RECIPE_IDS) {
        const circle = radioCircles[id];
        if (circle) {
          if (id === this.roastModalRecipe) {
            circle.setFillStyle(P.AWNING);
          } else {
            circle.setFillStyle(0xAAAAAA);
          }
        }
      }

      // Update batch size text
      if (batchSizeText) batchSizeText.setText(`${this.roastModalBatchLbs} lbs`);
    };

    // Declare batchSizeText early (used in refreshPreview closure)
    let batchSizeText: Phaser.GameObjects.Text | null = null;

    for (const id of RECIPE_IDS) {
      const ry = recipeRowY[id];
      const unlocked = this.state.recipesUnlocked.has(id);
      const cogs = cogsForRecipe(id);
      const textColor = unlocked ? "#2C2416" : "#999977";
      const threshold = RECIPE_UNLOCK_THRESHOLD[id];
      const lockLabel = unlocked
        ? `$${cogs.toFixed(2)}/lb`
        : `locked — earn $${threshold.toFixed(0)} lifetime`;

      // Radio indicator
      const radio = this.add.circle(mX + 12, ry + 4, 4, 0xAAAAAA)
        .setStrokeStyle(1, P.PANEL_BORDER);
      this.roastModalGroup.add(radio);
      radioCircles[id] = radio;

      const recipeTxt = this.add.text(mX + 22, ry, `${RECIPE_DISPLAY[id]}  ${lockLabel}`, {
        ...TEXT_STYLE_LABEL, color: textColor,
      });
      this.roastModalGroup.add(recipeTxt);

      if (unlocked) {
        // Clickable row background for selection
        const rowHit = this.add.rectangle(mX + mW / 2, ry + 4, mW - 12, 11, 0x000000, 0)
          .setInteractive({ cursor: "pointer" });
        this.roastModalGroup.add(rowHit);
        rowHit.on("pointerdown", () => {
          this.roastModalRecipe = id;
          refreshPreview();
        });
        rowHit.on("pointerover", () => rowHit.setAlpha(0.15));
        rowHit.on("pointerout",  () => rowHit.setAlpha(0));
      }
    }

    // Set initial radio fill for classic_salted
    radioCircles["classic_salted"].setFillStyle(P.AWNING);

    // Divider
    const divY1 = mY + 72;
    this.roastModalGroup.add(this.add.rectangle(mX + mW / 2, divY1, mW - 8, 1, P.PANEL_BORDER));

    // ---- Batch size section ----
    this.roastModalGroup.add(this.add.text(mX + 6, divY1 + 4, "BATCH SIZE", TEXT_STYLE_LABEL));

    const maxBatch = Math.min(BATCH_MAX_LBS, Math.floor(this.state.rawStockLbs));
    const quickPicks = [10, 25, 50].filter(n => n <= maxBatch);
    // Always include at least min batch
    if (quickPicks.length === 0) quickPicks.push(BATCH_MIN_LBS);

    let bx = mX + 6;
    const batchBtnY = divY1 + 16;

    for (const qty of quickPicks) {
      const btn = this.add.rectangle(bx + 16, batchBtnY + 6, 32, 14, P.AWNING)
        .setStrokeStyle(1, P.PANEL_BORDER)
        .setInteractive({ cursor: "pointer" });
      this.roastModalGroup.add(btn);
      const t = this.add.text(bx + 16, batchBtnY + 6, `${qty}lb`, {
        fontSize: "7px", color: "#2C2416", fontFamily: "monospace",
      }).setOrigin(0.5);
      this.roastModalGroup.add(t);
      btn.on("pointerdown", () => {
        this.roastModalBatchLbs = qty;
        refreshPreview();
      });
      btn.on("pointerover", () => btn.setAlpha(0.8));
      btn.on("pointerout",  () => btn.setAlpha(1));
      bx += 38;
    }

    // Custom qty stepper
    const customLabel = this.add.text(bx + 4, batchBtnY, "Custom:", TEXT_STYLE_LABEL);
    this.roastModalGroup.add(customLabel);
    batchSizeText = this.add.text(bx + 50, batchBtnY, `${this.roastModalBatchLbs} lbs`, TEXT_STYLE_LABEL);
    this.roastModalGroup.add(batchSizeText);

    const stepDown = this.add.rectangle(bx + 50, batchBtnY + 14, 20, 12, 0xAAAAAA)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.roastModalGroup.add(stepDown);
    this.roastModalGroup.add(
      this.add.text(bx + 50, batchBtnY + 14, "▼", { fontSize: "7px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5)
    );
    stepDown.on("pointerdown", () => {
      this.roastModalBatchLbs = Math.max(BATCH_MIN_LBS, this.roastModalBatchLbs - 5);
      refreshPreview();
    });

    const stepUp = this.add.rectangle(bx + 76, batchBtnY + 14, 20, 12, 0xAAAAAA)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.roastModalGroup.add(stepUp);
    this.roastModalGroup.add(
      this.add.text(bx + 76, batchBtnY + 14, "▲", { fontSize: "7px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5)
    );
    stepUp.on("pointerdown", () => {
      this.roastModalBatchLbs = Math.min(maxBatch, this.roastModalBatchLbs + 5);
      refreshPreview();
    });

    // Divider
    const divY2 = divY1 + 34;
    this.roastModalGroup.add(this.add.rectangle(mX + mW / 2, divY2, mW - 8, 1, P.PANEL_BORDER));

    // ---- Preview section ----
    this.roastModalGroup.add(this.add.text(mX + 6, divY2 + 4, "PREVIEW", TEXT_STYLE_LABEL));

    const py = divY2 + 14;
    const p0 = this.add.text(mX + 6, py, "", TEXT_STYLE_LABEL);
    const p1 = this.add.text(mX + 6, py + 11, "", TEXT_STYLE_LABEL);
    const p2 = this.add.text(mX + 6, py + 22, "", { ...TEXT_STYLE_LABEL, color: "#4A7C4E" });
    const p3 = this.add.text(mX + 6, py + 33, "", TEXT_STYLE_LABEL);
    const p4 = this.add.text(mX + 6, py + 44, "", TEXT_STYLE_LABEL); // error line
    previewLines.push(p0, p1, p2, p3, p4);
    for (const pl of previewLines) this.roastModalGroup.add(pl);

    // Initial preview render
    refreshPreview();

    // ---- Buttons ----
    const btnY = mY + mH - 14;

    const cancelBtn = this.add.rectangle(mX + 60, btnY, 90, 18, 0x999977)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.roastModalGroup.add(cancelBtn);
    this.roastModalGroup.add(
      this.add.text(mX + 60, btnY, "CANCEL", { fontSize: "9px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5)
    );
    cancelBtn.on("pointerdown", () => this.closeRoastModal());

    const startBtn = this.add.rectangle(mX + 220, btnY, 120, 18, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.roastModalGroup.add(startBtn);
    this.roastModalGroup.add(
      this.add.text(mX + 220, btnY, "START ROAST", { fontSize: "9px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5)
    );
    startBtn.on("pointerdown", () => {
      const ev = startRoast(this.state, this.roastModalSlotIndex, this.roastModalRecipe, this.roastModalBatchLbs);
      if (!ev) {
        // Show inline error in preview area — do not close modal
        previewLines[4].setText(
          `Not enough cash for ingredients ($${(RECIPES[this.roastModalRecipe].ingredientCostPerLb * this.roastModalBatchLbs).toFixed(2)} needed).`
        ).setStyle({ ...TEXT_STYLE_LABEL, color: "#C0392B" });
      } else {
        this.closeRoastModal();
      }
      this.updateHUD();
    });
    startBtn.on("pointerover", () => startBtn.setAlpha(0.85));
    startBtn.on("pointerout",  () => startBtn.setAlpha(1.0));
  }

  private closeRoastModal(): void {
    if (this.roastModalGroup) {
      this.roastModalGroup.destroy(true);
      this.roastModalGroup = undefined;
    }
    this.roastModalOpen = false;
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // Upgrades modal (Wave 4: roaster tiers + queue slots capital-investment lesson)
  // No countdown timers, no FOMO. Insufficient-cash = grey + earn-more hint.
  // DARK_PATTERN_GATE §A.1 / §A.5 compliant: no pressure, no wall-clock urgency.
  // ---------------------------------------------------------------------------

  private openUpgradesModal(): void {
    if (this.upgradesModalOpen) return;
    this.upgradesModalOpen = true;

    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 320, mH = 220;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    this.upgradesModalGroup = this.add.group();

    // Backdrop
    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.55)
      .setInteractive();
    this.upgradesModalGroup.add(backdrop);

    // Panel
    this.upgradesModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
        .setStrokeStyle(2, P.PANEL_BORDER)
    );

    // Header
    this.upgradesModalGroup.add(
      this.add.text(mX + 6, mY + 5, "UPGRADES — Capital Investment", TEXT_STYLE_HEADER)
    );

    // Close [×]
    const closeBtn = this.add.rectangle(mX + mW - 12, mY + 11, 16, 14, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.upgradesModalGroup.add(closeBtn);
    this.upgradesModalGroup.add(
      this.add.text(mX + mW - 12, mY + 11, "×", { fontSize: "10px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    closeBtn.on("pointerdown", () => this.closeUpgradesModal());

    // Divider
    this.upgradesModalGroup.add(this.add.rectangle(mX + mW / 2, mY + 21, mW - 8, 1, P.PANEL_BORDER));

    let rowY = mY + 27;

    // ---- Section: Roaster Tiers ----
    this.upgradesModalGroup.add(this.add.text(mX + 6, rowY, "ROASTER", { ...TEXT_STYLE_LABEL, color: "#8B6F47" }));
    rowY += 12;

    const currentTierIdx = ROASTER_TIER_ORDER.indexOf(this.state.roasterTier as RoasterTier);
    const tierLabels: Record<RoasterTier, string> = {
      tin_pan:    "Tin Pan  (1.0×)",
      copper:     "Copper   (0.6×)",
      industrial: "Industrial (0.2×)",
    };
    const tierDesc: Record<RoasterTier, string> = {
      tin_pan:    "starter",
      copper:     "40% faster roast",
      industrial: "80% faster roast",
    };

    for (let i = 0; i < ROASTER_TIER_ORDER.length; i++) {
      const tier = ROASTER_TIER_ORDER[i];
      const isCurrent = i === currentTierIdx;
      const isPurchasable = i === currentTierIdx + 1;
      const isLocked = i > currentTierIdx + 1;
      const cost = ROASTER_UPGRADE_COST[tier];

      // Payback hint: daily net ~$60, payback = cost / 60
      const paybackDays = cost > 0 ? Math.round(cost / 60) : 0;
      const paybackStr = isPurchasable && cost > 0 ? `  (~${paybackDays}d payback)` : "";

      const labelColor: string = isCurrent ? "#4A7C4E" : isLocked ? "#999977" : "#2C2416";

      const lineText = `  ${isCurrent ? "▶" : " "} ${tierLabels[tier]}  — ${tierDesc[tier]}${paybackStr}`;
      this.upgradesModalGroup.add(
        this.add.text(mX + 6, rowY, lineText, { ...TEXT_STYLE_LABEL, color: isCurrent ? "#4A7C4E" : labelColor })
      );

      if (isPurchasable) {
        const canAfford = this.state.cash >= cost;
        const btnColor = canAfford ? P.AWNING : 0x999977;
        const buyBtn = this.add.rectangle(mX + mW - 46, rowY + 4, 72, 13, btnColor)
          .setStrokeStyle(1, P.PANEL_BORDER)
          .setInteractive({ cursor: canAfford ? "pointer" : "default" });
        this.upgradesModalGroup.add(buyBtn);

        const btnLabel = canAfford
          ? `BUY $${cost}`
          : `earn $${(cost - this.state.cash).toFixed(0)} more`;
        this.upgradesModalGroup.add(
          this.add.text(mX + mW - 46, rowY + 4, btnLabel, {
            fontSize: "7px",
            color: canAfford ? "#2C2416" : "#666644",
            fontFamily: "monospace",
          }).setOrigin(0.5)
        );

        if (canAfford) {
          buyBtn.on("pointerdown", () => {
            const ev = buyRoasterUpgrade(this.state);
            if (ev) {
              playButtonTick();
              this.closeUpgradesModal();
              this.showToast(`Upgraded to ${(ev.detail.nextTier as string).replace("_", " ")}! Roast speed improved.`);
            }
          });
          buyBtn.on("pointerover", () => buyBtn.setAlpha(0.85));
          buyBtn.on("pointerout",  () => buyBtn.setAlpha(1.0));
        }
      }

      rowY += 14;
    }

    // Divider
    this.upgradesModalGroup.add(this.add.rectangle(mX + mW / 2, rowY + 2, mW - 8, 1, P.PANEL_BORDER));
    rowY += 8;

    // ---- Section: Queue Slots ----
    this.upgradesModalGroup.add(this.add.text(mX + 6, rowY, "ROAST QUEUE SLOTS", { ...TEXT_STYLE_LABEL, color: "#8B6F47" }));
    rowY += 12;

    const currentSlots = this.state.roastSlots.length;
    for (let slotCount = STARTING_QUEUE_SLOTS; slotCount <= MAX_QUEUE_SLOTS; slotCount++) {
      const isCurrent = slotCount === currentSlots;
      const isPurchasable = slotCount === currentSlots + 1;
      const isLocked = slotCount > currentSlots + 1;

      // Cost to buy this slot (purchaseIdx = slotCount - STARTING_QUEUE_SLOTS - 1)
      const purchaseIdx = slotCount - STARTING_QUEUE_SLOTS - 1;
      const cost = QUEUE_SLOT_COST[purchaseIdx] ?? 0;
      const paybackDays = cost > 0 ? Math.round(cost / 50) : 0;
      const paybackStr = isPurchasable && cost > 0 ? `  (~${paybackDays}d payback)` : "";

      const prefix = isCurrent ? "▶" : " ";
      const lineText = `  ${prefix} ${slotCount} Slot${slotCount > 1 ? "s" : ""}  — ${slotCount === 1 ? "starter" : `parallel batch × ${slotCount}`}${paybackStr}`;
      const lineColor = isCurrent ? "#4A7C4E" : isLocked ? "#999977" : "#2C2416";
      this.upgradesModalGroup.add(
        this.add.text(mX + 6, rowY, lineText, { ...TEXT_STYLE_LABEL, color: lineColor })
      );

      if (isPurchasable) {
        const canAfford = this.state.cash >= cost;
        const btnColor = canAfford ? P.AWNING : 0x999977;
        const buyBtn = this.add.rectangle(mX + mW - 46, rowY + 4, 72, 13, btnColor)
          .setStrokeStyle(1, P.PANEL_BORDER)
          .setInteractive({ cursor: canAfford ? "pointer" : "default" });
        this.upgradesModalGroup.add(buyBtn);

        const btnLabel = canAfford
          ? `BUY $${cost}`
          : `earn $${(cost - this.state.cash).toFixed(0)} more`;
        this.upgradesModalGroup.add(
          this.add.text(mX + mW - 46, rowY + 4, btnLabel, {
            fontSize: "7px",
            color: canAfford ? "#2C2416" : "#666644",
            fontFamily: "monospace",
          }).setOrigin(0.5)
        );

        if (canAfford) {
          buyBtn.on("pointerdown", () => {
            const ev = buyQueueSlot(this.state);
            if (ev) {
              playButtonTick();
              // Rebuild slot UI for the newly added slot
              this.rebuildSlotUI();
              this.closeUpgradesModal();
              this.showToast(`Queue expanded to ${(ev.detail.newSlotCount as number)} slots! Run more batches at once.`);
            }
          });
          buyBtn.on("pointerover", () => buyBtn.setAlpha(0.85));
          buyBtn.on("pointerout",  () => buyBtn.setAlpha(1.0));
        }
      }

      rowY += 14;
    }

    // ---- Day-factor legend (small, informational, no pressure) ----
    rowY += 4;
    this.upgradesModalGroup.add(this.add.rectangle(mX + mW / 2, rowY + 2, mW - 8, 1, P.PANEL_BORDER));
    rowY += 6;
    this.upgradesModalGroup.add(
      this.add.text(mX + 6, rowY, "THIS WEEK  Mon 0.85 · Tue 0.90 · Wed 0.95 · Thu 1.00 · Fri 1.10 · Sat 1.25 · Sun 1.10", {
        fontSize: "6px", color: "#8B6F47", fontFamily: "monospace",
      })
    );

    // ---- Save Export / Import buttons (item 2) ----
    // All local — CRIT-1 compliant (zero server).
    rowY += 10;
    this.upgradesModalGroup.add(this.add.rectangle(mX + mW / 2, rowY + 2, mW - 8, 1, P.PANEL_BORDER));
    rowY += 8;

    const exportBtn = this.add.rectangle(mX + 60, rowY + 6, 90, 14, 0x445566)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.upgradesModalGroup.add(exportBtn);
    this.upgradesModalGroup.add(
      this.add.text(mX + 60, rowY + 6, "EXPORT SAVE", { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    exportBtn.on("pointerdown", () => {
      const json = serialize(this.state, this.playtimeSeconds);
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "driving-me-nuts-save.json";
      a.click();
      URL.revokeObjectURL(url);
    });
    exportBtn.on("pointerover", () => exportBtn.setAlpha(0.85));
    exportBtn.on("pointerout",  () => exportBtn.setAlpha(1.0));

    const importBtn = this.add.rectangle(mX + 170, rowY + 6, 90, 14, 0x445566)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.upgradesModalGroup.add(importBtn);
    this.upgradesModalGroup.add(
      this.add.text(mX + 170, rowY + 6, "IMPORT SAVE", { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    importBtn.on("pointerdown", () => {
      const fileInput = document.createElement("input");
      fileInput.type   = "file";
      fileInput.accept = ".json,application/json";
      fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string | undefined;
          if (!text) {
            this.showToast("Import failed: could not read file.");
            return;
          }
          const result = importEnvelopeText(text, this.storage);
          if (!result.ok || !result.state) {
            this.showToast(result.errorMessage ?? "Import failed: unknown error.");
          } else {
            this.state = result.state;
            // RT-2: imported save may have a different queue-slot count than the
            // scene was built with — reconcile UI rows BEFORE updateHUD touches them.
            this.syncSlotUI();
            this.closeUpgradesModal();
            this.updateHUD();
            this.showToast(result.previousSaveBackedUp
              ? "Save imported. (Your previous save was backed up automatically.)"
              : "Save imported — game state restored.");
          }
        };
        reader.readAsText(file);
      };
      fileInput.click();
    });
    importBtn.on("pointerover", () => importBtn.setAlpha(0.85));
    importBtn.on("pointerout",  () => importBtn.setAlpha(1.0));

    // Close button at bottom
    rowY += 14;
    const doneBtn = this.add.rectangle(mX + mW / 2, mY + mH - 12, 80, 16, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.upgradesModalGroup.add(doneBtn);
    this.upgradesModalGroup.add(
      this.add.text(mX + mW / 2, mY + mH - 12, "CLOSE", { fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    doneBtn.on("pointerdown", () => this.closeUpgradesModal());
    doneBtn.on("pointerover", () => doneBtn.setAlpha(0.85));
    doneBtn.on("pointerout",  () => doneBtn.setAlpha(1.0));
  }

  private closeUpgradesModal(): void {
    if (this.upgradesModalGroup) {
      this.upgradesModalGroup.destroy(true);
      this.upgradesModalGroup = undefined;
    }
    this.upgradesModalOpen = false;
    this.updateHUD();
  }

  /**
   * Rebuild slot UI objects after a queue slot purchase.
   * Adds the new slot's rect/label/bar to the existing slot arrays.
   * Called immediately after buyQueueSlot mutates state.roastSlots.
   */
  private rebuildSlotUI(): void {
    // Add the newest slot (last index) — existing slots are already rendered.
    this.addSlotUIRow(this.state.roastSlots.length - 1);
  }

  /**
   * RT-2: reconcile the slot-UI arrays with state.roastSlots after the state
   * object is replaced wholesale (save import). An imported save can have MORE
   * or FEWER slots than the scene was built with; without this, updateHUD()
   * indexes past the UI arrays and crashes on undefined (black screen).
   */
  private syncSlotUI(): void {
    // Remove surplus rows (imported save has fewer slots than the current UI)
    while (this.slotRects.length > this.state.roastSlots.length) {
      this.slotRects.pop()?.destroy();
      this.slotLabels.pop()?.destroy();
      this.slotBars.pop()?.destroy();
      this.slotBarBgs.pop()?.destroy();
    }
    // Add missing rows (imported save has more slots than the current UI)
    while (this.slotRects.length < this.state.roastSlots.length) {
      this.addSlotUIRow(this.slotRects.length);
    }
  }

  /** Build one roast-queue slot row (rect, label, progress bar) at slot index i. */
  private addSlotUIRow(i: number): void {
    const qX = 5, qY = 20;
    const sx = qX + 5;
    const sy = qY + 18 + i * 30;
    const sw = 150, sh = 24;

    const slotRect = this.add.rectangle(sx + sw / 2, sy + sh / 2, sw, sh, P.SLOT_EMPTY)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });

    const barBg = this.add.rectangle(sx + 3 + 70, sy + sh / 2 + 6, 74, 5, 0xAAAAAA);
    barBg.setVisible(false);

    const bar = this.add.rectangle(sx + 3 + 33, sy + sh / 2 + 6, 0, 5, P.SLOT_ROAST);
    bar.setVisible(false);

    const slotLabel = this.add.text(sx + 3, sy + 3, `Slot ${i + 1}: [Empty] — tap to roast`, TEXT_STYLE_LABEL);

    this.slotRects.push(slotRect);
    this.slotLabels.push(slotLabel);
    this.slotBars.push(bar);
    this.slotBarBgs.push(barBg);

    const slotIndex = i;
    slotRect.on("pointerdown", () => {
      if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.rescueModalOpen) {
        this.handleSlotClick(slotIndex);
      }
    });
    slotRect.on("pointerover", () => slotRect.setAlpha(0.85));
    slotRect.on("pointerout",  () => slotRect.setAlpha(1.0));
  }

  // ---------------------------------------------------------------------------
  // Supply modal (P1_WIREFRAMES §3)
  // ---------------------------------------------------------------------------

  private openSupplyModal(): void {
    if (this.supplyModalOpen) return;
    this.supplyModalOpen = true;
    this.supplyQty = 50; // reset to sensible default

    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 280, mH = 170;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    this.modalGroup = this.add.group();

    // Backdrop
    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.5)
      .setInteractive();
    this.modalGroup.add(backdrop);

    // Panel
    const panel = this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
      .setStrokeStyle(2, P.PANEL_BORDER);
    this.modalGroup.add(panel);

    // Header
    const hdr = this.add.text(mX + 6, mY + 6, "BUY RAW PEANUTS", TEXT_STYLE_HEADER);
    this.modalGroup.add(hdr);

    // F7: bulk discount table derived from economy constants (no hardcoded prices)
    const p0 = RAW_PEANUT_BASE_PRICE;
    const p5 = p0 * (1 - bulkDiscountFor(100));
    const p12 = p0 * (1 - bulkDiscountFor(500));
    const tableLines = [
      `  1–99 lbs:  $${p0.toFixed(2)}/lb  (no discount)`,
      ` 100–499:   $${p5.toFixed(2)}/lb  (–5%)`,
      ` 500+:       $${p12.toFixed(2)}/lb  (–12%)`,
    ];
    let ty = mY + 22;
    for (const line of tableLines) {
      const t = this.add.text(mX + 6, ty, line, TEXT_STYLE_LABEL);
      this.modalGroup.add(t);
      ty += 12;
    }

    // Qty controls
    const qLabel = this.add.text(mX + 6, ty + 4, "Qty:", TEXT_STYLE_BODY);
    this.modalGroup.add(qLabel);

    const qtyText = this.add.text(mX + 36, ty + 4, `${this.supplyQty} lbs`, TEXT_STYLE_BODY);
    this.modalGroup.add(qtyText);

    const makeQtyBtn = (label: string, x: number, delta: number): void => {
      const btn = this.add.rectangle(x, ty + 12, 32, 14, P.AWNING)
        .setStrokeStyle(1, P.PANEL_BORDER)
        .setInteractive({ cursor: "pointer" });
      this.modalGroup!.add(btn);
      const t = this.add.text(x, ty + 12, label, { fontSize: "8px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5);
      this.modalGroup!.add(t);
      btn.on("pointerdown", () => {
        this.supplyQty = Math.max(10, Math.min(1000, this.supplyQty + delta));
        qtyText.setText(`${this.supplyQty} lbs`);
        previewText.setText(this.buildSupplyPreview());
      });
    };

    makeQtyBtn("-10", mX + 110, -10);
    makeQtyBtn("+10", mX + 148, +10);
    makeQtyBtn("+50", mX + 186, +50);
    makeQtyBtn("+100", mX + 226, +100);

    // Cost preview
    const previewText = this.add.text(mX + 6, ty + 28, this.buildSupplyPreview(), TEXT_STYLE_BODY);
    this.modalGroup.add(previewText);

    // Cash after preview
    const cashLine = this.add.text(mX + 6, ty + 42, "", TEXT_STYLE_BODY);
    this.modalGroup.add(cashLine);

    // Rebuild preview with cash line
    const rebuildPreview = (): void => {
      previewText.setText(this.buildSupplyPreview());
      const cost = this.calcSupplyCost(this.supplyQty);
      const after = this.state.cash - cost;
      cashLine.setText(`Cash after: $${this.state.cash.toFixed(2)} – $${cost.toFixed(2)} = $${Math.max(0, after).toFixed(2)}`);
      cashLine.setStyle(after >= 0 ? TEXT_STYLE_GREEN : TEXT_STYLE_RED);
    };
    rebuildPreview();

    // F11: track this specific timer event so closeSupplyModal can remove only it
    // (not all events, which would kill unrelated toast timers)
    this.supplyModalRefreshEvent = this.time.addEvent({ delay: 100, repeat: -1, callback: rebuildPreview });

    // Buttons
    const cancelBtn = this.add.rectangle(mX + 60, mY + mH - 14, 90, 18, 0x999977)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.modalGroup.add(cancelBtn);
    const cancelTxt = this.add.text(mX + 60, mY + mH - 14, "CANCEL", { fontSize: "9px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5);
    this.modalGroup.add(cancelTxt);
    cancelBtn.on("pointerdown", () => this.closeSupplyModal());

    const confirmBtn = this.add.rectangle(mX + 200, mY + mH - 14, 110, 18, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.modalGroup.add(confirmBtn);
    const confirmTxt = this.add.text(mX + 200, mY + mH - 14, "CONFIRM ORDER", { fontSize: "9px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5);
    this.modalGroup.add(confirmTxt);
    confirmBtn.on("pointerdown", () => {
      const ev = buyRaw(this.state, this.supplyQty);
      if (!ev) {
        this.showToast("Not enough cash!");
      } else {
        this.closeSupplyModal();
      }
      this.updateHUD();
    });
  }

  private buildSupplyPreview(): string {
    const cost = this.calcSupplyCost(this.supplyQty);
    const priceLb = cost / this.supplyQty;
    return `${this.supplyQty} lbs @ $${priceLb.toFixed(2)}/lb = $${cost.toFixed(2)}`;
  }

  private calcSupplyCost(qty: number): number {
    // F7: use exported bulkDiscountFor — single source of truth
    return qty * RAW_PEANUT_BASE_PRICE * (1 - bulkDiscountFor(qty));
  }

  private closeSupplyModal(): void {
    // F11: remove only the modal's own refresh timer, not all events (toast timers would die)
    if (this.supplyModalRefreshEvent) {
      this.supplyModalRefreshEvent.destroy();
      this.supplyModalRefreshEvent = undefined;
    }
    if (this.modalGroup) {
      this.modalGroup.destroy(true);
      this.modalGroup = undefined;
    }
    this.supplyModalOpen = false;
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // End of day report (UI_WIREFRAMES §4)
  // ---------------------------------------------------------------------------

  private triggerEndOfDay(): void {
    if (this.reportOpen) return;
    this.reportOpen = true;

    // Audio: day-end sting (synthesized, SOUND_DESIGN.md diegetic)
    playDayEnd();

    // Tutorial: step 2 ("Watch the report tonight") completes when the
    // report opens; mark as complete to fulfil the third tutorial beat.
    this.advanceTutorialOnAction(2);

    // Snapshot unlocked recipes before endOfDay so we can detect new unlocks.
    const unlockedBefore = new Set(this.state.recipesUnlocked);

    // Pause the sim — reportOpen flag stops tick() calls
    const report = endOfDay(this.state);

    // Wave 5: surface rescue arc events as toasts (factual, never shaming)
    for (const ev of report.rescueEvents) {
      const msg = ev.detail.message as string | undefined;
      if (msg) {
        this.time.delayedCall(500, () => this.showToast(msg));
      }
    }

    // Show recipe-unlock toasts for any newly unlocked recipes.
    const RECIPE_LABELS: Record<RecipeId, string> = {
      classic_salted: "Classic Salted",
      honey_cinnamon: "Honey Cinnamon",
      ghost_pepper:   "Ghost Pepper",
    };
    const RECIPE_TIPS: Record<RecipeId, string> = {
      classic_salted: "",
      honey_cinnamon: "Higher COGS, higher ceiling — try it.",
      ghost_pepper:   "Spicy niche: fewer buyers, big margin.",
    };
    for (const recipeId of this.state.recipesUnlocked) {
      if (!unlockedBefore.has(recipeId)) {
        this.time.delayedCall(300, () => {
          this.showToast(
            `New recipe unlocked: ${RECIPE_LABELS[recipeId as RecipeId]}! ${RECIPE_TIPS[recipeId as RecipeId]}`
          );
        });
      }
    }

    this.showDayReport(report);
  }

  private showDayReport(r: DayReport): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const rW = 300;
    // +14px for F1 "Cash spent on production" row; +14px more when offline row present (spec §6)
    // +14px for Wave 5 liability line when debts/obligations are active
    // +20px for sparkline row when ≥1 day of history exists (item 3)
    const sparklineHistory = this.state.netHistory.slice(-7); // last 7 days
    const hasSparkline = sparklineHistory.length >= 1;
    const rH = 224 + (r.offlineEarned > 0 ? 14 : 0) + (r.activeDebtSummary ? 14 : 0) + (hasSparkline ? 20 : 0);
    const rX = (W - rW) / 2;
    const rY = (H - rH) / 2;

    this.reportGroup = this.add.group();

    // Backdrop
    const bg = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.65)
      .setInteractive(); // block clicks through
    this.reportGroup.add(bg);

    // Panel
    const panel = this.add.rectangle(rX + rW / 2, rY + rH / 2, rW, rH, P.PANEL_BG)
      .setStrokeStyle(2, P.PANEL_BORDER);
    this.reportGroup.add(panel);

    // Header
    this.reportGroup.add(
      this.add.text(rX + rW / 2, rY + 8, `END OF DAY — Day ${r.dayNumber} Summary`, TEXT_STYLE_HEADER).setOrigin(0.5, 0)
    );

    // Divider
    this.reportGroup.add(this.add.rectangle(rX + rW / 2, rY + 22, rW - 8, 1, P.PANEL_BORDER));

    // Location / ops line
    this.reportGroup.add(this.add.text(rX + 8, rY + 27, `Location: Farmers' Market  |  Units sold: ${r.unitsSold.toFixed(1)} lbs`, TEXT_STYLE_LABEL));

    // Revenue & COGS box
    // F7: derive COGS/lb from economy constants; F8: show avg realized price (revenue/unitsSold)
    const cogsLbDisplay = (RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb).toFixed(2);
    const rows: Array<[string, string, Phaser.Types.GameObjects.Text.TextStyle]> = [
      [`Revenue  (${r.unitsSold.toFixed(1)} lbs @ $${r.avgRealizedPrice.toFixed(2)} avg):`, `$${r.revenue.toFixed(2)}`, TEXT_STYLE_BODY],
      [`COGS     (@ $${cogsLbDisplay}/lb):`, `–$${r.cogs.toFixed(2)}`, TEXT_STYLE_RED],
      [`Gross Profit:`, `$${r.grossProfit.toFixed(2)}  (${r.grossMarginPct.toFixed(0)}%)`, r.grossMarginPct >= 60 ? TEXT_STYLE_GREEN : TEXT_STYLE_RED],
      // F1: separate cash-flow lesson line — production outflow vs. recognized COGS
      [`Cash spent on production today:`, `–$${r.cashSpentOnProduction.toFixed(2)}`, TEXT_STYLE_RED],
      [`Fixed Costs  (permit + fuel):`, `–$${r.fixedCosts.toFixed(2)}`, TEXT_STYLE_RED],
      // F13 fix: offline earnings shown as a distinct positive line (spec §6 / DARK_PATTERN_GATE Q8)
      ...(r.offlineEarned > 0
        ? [[`Offline rest earnings:`, `+$${r.offlineEarned.toFixed(2)}`, TEXT_STYLE_GREEN] as [string, string, Phaser.Types.GameObjects.Text.TextStyle]]
        : []),
      [`Net Profit:`, `$${r.net.toFixed(2)}`, r.net >= 0 ? TEXT_STYLE_GREEN : TEXT_STYLE_RED],
      // Wave 5: liability line — teaches liabilities vs cash (neutral, not shaming)
      ...(r.activeDebtSummary
        ? [[`Liabilities:`, r.activeDebtSummary, TEXT_STYLE_RED] as [string, string, Phaser.Types.GameObjects.Text.TextStyle]]
        : []),
    ];

    let rowY = rY + 42;
    for (const [label, value, style] of rows) {
      this.reportGroup.add(this.add.text(rX + 8, rowY, label, TEXT_STYLE_LABEL));
      this.reportGroup.add(this.add.text(rX + rW - 8, rowY, value, style).setOrigin(1, 0));
      rowY += 14;
    }

    // Divider
    this.reportGroup.add(this.add.rectangle(rX + rW / 2, rowY + 2, rW - 8, 1, P.PANEL_BORDER));
    rowY += 8;

    // Cash flow line
    this.reportGroup.add(
      this.add.text(rX + 8, rowY, `Cash: $${r.cashBefore.toFixed(2)} → $${r.cashAfter.toFixed(2)}`, TEXT_STYLE_BODY)
    );
    rowY += 16;

    // Insight line (THE key teaching surface — question, not shame)
    this.reportGroup.add(
      this.add.rectangle(rX + rW / 2, rowY + 14, rW - 10, 28, 0xEDD99A).setStrokeStyle(1, P.PANEL_BORDER)
    );
    this.reportGroup.add(
      this.add.text(rX + 8, rowY + 4, `Insight: ${r.insightLine}`, {
        ...TEXT_STYLE_LABEL,
        wordWrap: { width: rW - 16 },
      })
    );
    rowY += 36;

    // ---- Net history sparkline (item 3: last-7-days bar row) ----
    // Bookkeeping concept: factual framing only, no FOMO. Green = positive net, red = negative.
    if (hasSparkline) {
      this.reportGroup.add(
        this.add.text(rX + 8, rowY, "Last 7 days:", TEXT_STYLE_LABEL)
      );
      const maxAbs = Math.max(1, ...sparklineHistory.map(Math.abs));
      const barMaxH = 10;
      const barW    = 12;
      const barGap  = 3;
      const barBaseY = rowY + barMaxH + 2;
      for (let i = 0; i < sparklineHistory.length; i++) {
        const netVal = sparklineHistory[i];
        const barH   = Math.max(2, Math.round((Math.abs(netVal) / maxAbs) * barMaxH));
        const barColor = netVal >= 0 ? P.CASH_GREEN : P.WARNING_RED;
        const bx = rX + 80 + i * (barW + barGap);
        this.reportGroup.add(
          this.add.rectangle(bx + barW / 2, barBaseY - barH / 2, barW, barH, barColor)
        );
      }
      rowY += 20;
    }

    // "Start next day" button (no countdown, no pressure — DARK_PATTERN_GATE B.1)
    const nextBtn = this.add.rectangle(rX + rW / 2, rY + rH - 14, 140, 18, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.reportGroup.add(nextBtn);
    this.reportGroup.add(
      this.add.text(rX + rW / 2, rY + rH - 14, "START NEXT DAY", { fontSize: "9px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5)
    );
    nextBtn.on("pointerdown", () => this.closeDayReport());
    nextBtn.on("pointerover", () => nextBtn.setAlpha(0.85));
    nextBtn.on("pointerout",  () => nextBtn.setAlpha(1.0));
  }

  private closeDayReport(): void {
    if (this.reportGroup) {
      this.reportGroup.destroy(true);
      this.reportGroup = undefined;
    }
    this.reportOpen = false;
    // Save after report is dismissed �� state is fully consistent post-endOfDay (spec §3)
    this.saveGame();
    this.updateHUD();

    // Wave 5: open rescue-offer modal after report if trigger fired this day
    if (this.state.rescueMode === "offer") {
      this.time.delayedCall(300, () => this.openRescueModal());
    }
  }

  /** Persist current state to storage. Called at safe save points only (never mid-tick). */
  private saveGame(): void {
    // W8: fire one-time non-blaming toast on first save failure.
    const onFail = this.saveFailed ? undefined : () => {
      this.saveFailed = true;
      this.showToast("Heads up — saving isn't working on this device; progress lasts this session only.");
    };
    trySave(this.storage, this.state, this.playtimeSeconds, onFail);
  }

  // ---------------------------------------------------------------------------
  // Coin pop feedback (P1_SPRITE_SPEC #5)
  // ---------------------------------------------------------------------------

  private spawnCoinPop(revenue: number): void {
    // Spawn near the truck serving window
    const W = this.scale.width;
    const truckX = W / 2 + 60;
    const truckY = 195;
    const x = truckX - 18 + Phaser.Math.Between(-8, 8);
    const y = truckY - 30;

    const circle = this.add.circle(x, y, 5, P.COIN_GOLD);
    const label  = this.add.text(x + 8, y - 4, `+$${revenue.toFixed(2)}`, {
      fontSize: "7px", color: "#FFD700", fontFamily: "monospace",
    });

    this.coinPops.push({ circle, label, life: 1.0 });
  }

  private tickCoinPops(dt: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.coinPops.length; i++) {
      const pop = this.coinPops[i];
      pop.life -= dt;
      const alpha = Math.max(0, pop.life);
      pop.circle.setAlpha(alpha);
      pop.label.setAlpha(alpha);
      // Float upward
      pop.circle.y -= 20 * dt;
      pop.label.y  -= 20 * dt;
      if (pop.life <= 0) toRemove.push(i);
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this.coinPops[idx].circle.destroy();
      this.coinPops[idx].label.destroy();
      this.coinPops.splice(idx, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Smoke wis animation (P1_SPRITE_SPEC #2)
  // ---------------------------------------------------------------------------

  private animateSmoke(dt: number): void {
    this.smokeTimer += dt;
    const activeRoasts = this.state.roastSlots.filter(s => s.status === "roasting").length;

    for (let i = 0; i < this.smokeCircles.length; i++) {
      const c = this.smokeCircles[i];
      if (i < activeRoasts) {
        // Pulse opacity and slight drift
        const phase = (this.smokeTimer * 0.8 + i * 1.1) % (Math.PI * 2);
        c.setAlpha(0.3 + 0.3 * Math.sin(phase));
        c.y = (195 - 50 - i * 8) + Math.sin(this.smokeTimer * 0.5 + i) * 3;
      } else {
        c.setAlpha(0);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // NPC ambient walk animation
  // ---------------------------------------------------------------------------

  private animateNpcs(dt: number): void {
    const W = this.scale.width;
    for (const npc of this.npcs) {
      npc.x += npc.dir * npc.speed * dt;
      if (npc.x > W - 60 || npc.x < 150) npc.dir *= -1;
      npc.rect.setPosition(npc.x, npc.y);
      npc.head.setPosition(npc.x, npc.y - npc.rect.height / 2 - 5);
    }
  }

  // ---------------------------------------------------------------------------
  // Toast notification (brief text overlay — no FOMO framing)
  // ---------------------------------------------------------------------------

  private showToast(msg: string): void {
    const W = this.scale.width;
    const toast = this.add.text(W / 2, 30, msg, {
      fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace",
      backgroundColor: "#2C2416", padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    this.time.delayedCall(1800, () => { if (toast.active) toast.destroy(); });
  }

  // ---------------------------------------------------------------------------
  // Gag speech-bubble toast (Wave 2)
  // Two-beat: customer line (1.8 s) → owner reply → total auto-dismiss ~4 s.
  // Never blocks input. Tracks its own timer per F11 rule (no removeAllEvents).
  // At most one bubble at a time — new gag silently cancels the previous one.
  // ---------------------------------------------------------------------------

  private showGagBubble(loreId: string): void {
    const line = LORE_BY_ID[loreId];
    if (!line) return;

    // Dismiss any existing bubble before showing the new one.
    this.dismissGagBubble();

    const W = this.scale.width;
    const truckX = W / 2 + 60;
    const truckY = 195;

    // Bubble anchor: just above the truck serving window (left side).
    const bX = truckX - 80;
    const bY = truckY - 80;
    const bW = 180;
    const bH = 36;

    // Background rect (speech bubble)
    const bg = this.add.rectangle(bX + bW / 2, bY + bH / 2, bW, bH, P.PANEL_BG)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setAlpha(0.95);

    // Small tail triangle pointing down toward the truck
    const tail = this.add.triangle(
      bX + bW / 2, bY + bH + 5,
      -6, 0,
      6, 0,
      0, 8,
      P.PANEL_BORDER,
    );

    // Customer line (shown immediately)
    const customerLine = this.add.text(bX + 4, bY + 3, `"${line.customer}"`, {
      fontSize: "7px", color: "#2C2416", fontFamily: "monospace",
      wordWrap: { width: bW - 8 },
    });

    // Owner reply (shown after a short pause)
    const ownerLine = this.add.text(bX + 4, bY + 20, "", {
      fontSize: "7px", color: "#4A7C4E", fontFamily: "monospace",
      wordWrap: { width: bW - 8 },
    });

    // Beat 1 → Beat 2: reveal owner reply after 1.8 s
    const beat2Timer = this.time.delayedCall(1800, () => {
      if (ownerLine.active) ownerLine.setText(line.owner);
    });

    // Auto-dismiss after 4 s total
    const dismissTimer = this.time.delayedCall(4000, () => {
      this.dismissGagBubble();
    });

    // Store only the dismiss timer as the bubble's tracked event.
    // beat2Timer is an independent one-shot that cleans itself up.
    // (We hold a ref to it so dismissGagBubble can remove it cleanly too.)
    void beat2Timer; // used above, no further reference needed

    this.gagBubble = { bg, tail, customerLine, ownerLine, timerEvent: dismissTimer };
  }

  private dismissGagBubble(): void {
    if (!this.gagBubble) return;
    const b = this.gagBubble;
    b.timerEvent.destroy();
    if (b.bg.active)           b.bg.destroy();
    if (b.tail.active)         b.tail.destroy();
    if (b.customerLine.active) b.customerLine.destroy();
    if (b.ownerLine.active)    b.ownerLine.destroy();
    this.gagBubble = undefined;
  }

  // ---------------------------------------------------------------------------
  // Rescue arc modal (Wave 5 — RESCUE_ARC_SCRIPT.md)
  //
  // Opens after the day-report dismisses, when state.rescueMode === "offer".
  // Four paths + QuickNut cautionary display + decline.
  // DARK_PATTERN_GATE compliance: no locked options, no pressure framing,
  // no countdown. QuickNut shown with full APR math; player may choose it —
  // the math itself is the teaching moment.
  // ---------------------------------------------------------------------------

  private openRescueModal(): void {
    if (this.rescueModalOpen || this.state.rescueMode !== "offer") return;
    this.rescueModalOpen = true;

    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 460, mH = 240;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    this.rescueModalGroup = this.add.group();

    // ---- Backdrop ----
    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.70)
      .setInteractive();
    this.rescueModalGroup.add(backdrop);

    // ---- Panel ----
    this.rescueModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
        .setStrokeStyle(2, P.PANEL_BORDER)
    );

    // ---- Old Joe portrait (Legsy-style code-drawn gruff elder) ----
    // Weathered, 70s. Different from Legsy: wider body, no pod shape — a human silhouette.
    // Built with same Palette A + monochrome; separate from drawLegsy (which is the mascot).
    this.drawOldJoePortrait(mX + 22, mY + mH - 14);

    // ---- Header ----
    this.rescueModalGroup.add(
      this.add.text(mX + 52, mY + 6, "TILL RUNS THIN — Old Joe's at the Window", TEXT_STYLE_HEADER)
    );

    // ---- Old Joe dialogue ----
    this.rescueModalGroup.add(
      this.add.text(mX + 52, mY + 20,
        "\"Long day? Cash-flow problems aren't shameful — that's how you learn.\nBefore tomorrow gets worse, let's talk about what gets you through the week.\"",
        { ...TEXT_STYLE_LABEL, color: "#5A3A1A", wordWrap: { width: mW - 60 } }
      )
    );

    // ---- Divider ----
    this.rescueModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + 48, mW - 8, 1, P.PANEL_BORDER)
    );

    // ---- Option cards (4 paths + decline) ----
    // Each card: 84px wide, 170px tall — 5 columns
    const cardW = 84, cardH = 170;
    const cardY = mY + 52;
    const cardGap = 4;
    const totalCardsW = cardW * 5 + cardGap * 4;
    const cardsStartX = mX + (mW - totalCardsW) / 2;

    type CardDef = {
      id: RescuePath;
      label: string;
      color: number;
      lines: string[];
    };

    const cards: CardDef[] = [
      {
        id: "loan",
        label: "OLD JOE'S LOAN",
        color: P.CASH_GREEN,
        lines: [
          "+$75 cash now",
          "Owe: $78.75",
          "Due: 14 days",
          "5% flat/season",
          "(≈20%/yr)",
          "",
          "Fair handshake.",
          "Pay any time.",
          "No hidden fees.",
        ],
      },
      {
        id: "credit",
        label: "MARTA'S CREDIT",
        color: P.AWNING,
        lines: [
          "+125 lbs raw",
          "(cash stays)",
          "Owe: $50.00",
          "Due: 14 days",
          "No interest.",
          "",
          "Marta vouched",
          "for you. Sell,",
          "then pay.",
        ],
      },
      {
        id: "preorder",
        label: "DEREK'S ORDER",
        color: 0x5A7A8A,
        lines: [
          "+$110 cash now",
          "Deliver 100lbs",
          "roasted in 7d",
          "",
          "Rev: $110",
          "COGS: ~$50",
          "Profit: ~$60",
          "",
          "Execute or",
          "trust is dented.",
        ],
      },
      {
        id: "payday",
        label: "QUICKNUT ⚠",
        color: 0xDD6600,
        lines: [
          "+$50 cash now",
          "Owe: $57.50",
          "Due: 14 days",
          "",
          "APR: ~391%",
          "Roll: +$7.50/2wk",
          "",
          "Old Joe says:",
          "\"Come to me",
          "first.\"",
        ],
      },
      {
        id: "decline",
        label: "DECLINE",
        color: 0x888866,
        lines: [
          "No action now.",
          "",
          "Can re-trigger",
          "next low-cash",
          "day.",
          "",
          "Old Joe:",
          "\"Door's open.",
          "Think on it.\"",
        ],
      },
    ];

    for (let ci = 0; ci < cards.length; ci++) {
      const card = cards[ci];
      const cx = cardsStartX + ci * (cardW + cardGap);
      const isQuickNut = card.id === "payday";

      // Card background — QuickNut gets an off-palette "sketchy flyer" look
      const cardBg = this.add.rectangle(cx + cardW / 2, cardY + cardH / 2, cardW, cardH,
        isQuickNut ? 0xFFEEBB : P.PANEL_BG
      ).setStrokeStyle(isQuickNut ? 2 : 1, isQuickNut ? 0xDD6600 : P.PANEL_BORDER)
        .setInteractive({ cursor: "pointer" });
      this.rescueModalGroup.add(cardBg);

      // Card header label
      const headerColor = isQuickNut ? "#CC4400" : "#2C2416";
      this.rescueModalGroup.add(
        this.add.text(cx + cardW / 2, cardY + 5, card.label, {
          fontSize: "6px", color: headerColor, fontFamily: "monospace", fontStyle: "bold",
          wordWrap: { width: cardW - 4 }, align: "center",
        }).setOrigin(0.5, 0)
      );

      // Card detail lines
      let lineY = cardY + 18;
      for (const line of card.lines) {
        if (line) {
          const lineColor = isQuickNut && (line.includes("391") || line.includes("Roll")) ? "#CC2200" : "#2C2416";
          this.rescueModalGroup.add(
            this.add.text(cx + 2, lineY, line, {
              fontSize: "5px", color: lineColor, fontFamily: "monospace",
              wordWrap: { width: cardW - 4 },
            })
          );
        }
        lineY += 8;
      }

      // Choose button at card bottom
      const btnLabel = card.id === "decline" ? "SKIP" :
                       card.id === "payday" ? "CHOOSE (see warning)" : "CHOOSE";
      const btnColor = card.id === "decline" ? 0x999977 :
                       isQuickNut ? 0xDD6600 : P.AWNING;
      const chooseBtn = this.add.rectangle(cx + cardW / 2, cardY + cardH - 8, cardW - 6, 13, btnColor)
        .setStrokeStyle(1, P.PANEL_BORDER)
        .setInteractive({ cursor: "pointer" });
      this.rescueModalGroup.add(chooseBtn);
      this.rescueModalGroup.add(
        this.add.text(cx + cardW / 2, cardY + cardH - 8, btnLabel, {
          fontSize: "5px", color: "#2C2416", fontFamily: "monospace",
        }).setOrigin(0.5)
      );

      const pathId = card.id;
      const handler = (): void => {
        chooseRescuePath(this.state, pathId);
        this.closeRescueModal();
        this.updateHUD();
        // Toast confirming the choice (factual, not congratulatory)
        const toastMsg = pathId === "loan"
          ? "Old Joe's loan: +$75. Owe $78.75 in 14 days."
          : pathId === "credit"
          ? "Marta's credit: +125 lbs raw. Owe $50 in 14 days."
          : pathId === "preorder"
          ? "Derek's order accepted: +$110. Deliver 100 lbs roasted in 7 days."
          : pathId === "payday"
          ? "QuickNut: +$50. $57.50 due in 14 days. Rolls +$7.50 if unpaid."
          : "Old Joe nods. Door stays open.";
        this.showToast(toastMsg);
        this.saveGame();
      };

      chooseBtn.on("pointerdown", handler);
      cardBg.on("pointerdown", handler);
      chooseBtn.on("pointerover", () => chooseBtn.setAlpha(0.85));
      chooseBtn.on("pointerout",  () => chooseBtn.setAlpha(1.0));
      cardBg.on("pointerover",  () => cardBg.setAlpha(0.9));
      cardBg.on("pointerout",   () => cardBg.setAlpha(1.0));
    }

    // ---- QuickNut extra warning strip at bottom (per script: Old Joe shows flyer + warning) ----
    const warnY = cardY + cardH + 4;
    this.rescueModalGroup.add(
      this.add.text(mX + 52, warnY,
        "QuickNut APR math: $7.50 fee on $50 for 14 days = 15%/period × 26 periods/yr = ~391% APR. Old Joe: \"It's designed to keep people in debt.\"",
        { fontSize: "5px", color: "#994400", fontFamily: "monospace", wordWrap: { width: mW - 60 } }
      )
    );

    // ---- Old Joe's closing note ----
    this.rescueModalGroup.add(
      this.add.text(mX + 52, warnY + 10,
        "\"Whatever you choose — keep an eye on the till. Cash flow is predictable if you're watching.\"",
        { fontSize: "5px", color: "#5A3A1A", fontFamily: "monospace", fontStyle: "italic", wordWrap: { width: mW - 60 } }
      )
    );
  }

  private closeRescueModal(): void {
    if (this.rescueModalGroup) {
      this.rescueModalGroup.destroy(true);
      this.rescueModalGroup = undefined;
    }
    this.rescueModalOpen = false;
  }

  /**
   * Draw Old Joe — weathered elder in a peanut-roasting-league cap.
   * Programmer-art, code-drawn. Palette A only.
   * (x, y) = bottom-centre of figure.
   */
  private drawOldJoePortrait(x: number, y: number): void {
    const g = this.rescueModalGroup!;
    const s = 0.9; // scale

    // Cap (faded, rectangular brim)
    g.add(this.add.rectangle(x, y - 54 * s, 20 * s, 6 * s, P.PANEL_BORDER)); // brim
    g.add(this.add.rectangle(x, y - 58 * s, 16 * s, 8 * s, 0x6A4F2F));       // crown (darker)

    // Head
    g.add(this.add.ellipse(x, y - 44 * s, 18 * s, 20 * s, P.NPC_SKIN));

    // Eyes (small, world-weary — narrower than Legsy's)
    g.add(this.add.rectangle(x - 4 * s, y - 46 * s, 4 * s, 2 * s, P.TEXT));
    g.add(this.add.rectangle(x + 4 * s, y - 46 * s, 4 * s, 2 * s, P.TEXT));

    // Wrinkle lines (horizontal marks each side of mouth area)
    g.add(this.add.rectangle(x - 6 * s, y - 42 * s, 3 * s, 1 * s, 0xB89070));
    g.add(this.add.rectangle(x + 6 * s, y - 42 * s, 3 * s, 1 * s, 0xB89070));

    // Mouth (straight line — weathered, not smiling)
    g.add(this.add.rectangle(x, y - 39 * s, 6 * s, 1 * s, P.TEXT));

    // Body (flannel shirt — wider than head)
    g.add(this.add.rectangle(x, y - 25 * s, 22 * s, 24 * s, 0x5A3A1A)); // flannel brown

    // Arms (raised slightly — holding flyer in right hand)
    g.add(this.add.rectangle(x - 14 * s, y - 24 * s, 6 * s, 14 * s, P.NPC_SKIN));
    g.add(this.add.rectangle(x + 14 * s, y - 28 * s, 6 * s, 18 * s, P.NPC_SKIN)); // right arm raised

    // Legs
    g.add(this.add.rectangle(x - 6 * s, y - 7 * s, 7 * s, 12 * s, P.PANEL_BORDER));
    g.add(this.add.rectangle(x + 6 * s, y - 7 * s, 7 * s, 12 * s, P.PANEL_BORDER));

    // QuickNut flyer in right hand (small neon-orange rectangle)
    g.add(this.add.rectangle(x + 18 * s, y - 34 * s, 10 * s, 8 * s, 0xFF6600)
      .setStrokeStyle(1, 0xDD4400));
    g.add(this.add.text(x + 18 * s, y - 34 * s, "QN", {
      fontSize: "4px", color: "#FFEE00", fontFamily: "monospace",
    }).setOrigin(0.5));
  }

  // ---------------------------------------------------------------------------
  // Reset Save — player-initiated with confirmation (spec req; gate-compliant §B.3)
  // ---------------------------------------------------------------------------

  private showResetConfirm(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 240, mH = 80;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    const group = this.add.group();

    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.5)
      .setInteractive();
    group.add(backdrop);

    const panel = this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
      .setStrokeStyle(2, P.PANEL_BORDER);
    group.add(panel);

    group.add(this.add.text(mX + mW / 2, mY + 10, "Reset save?", TEXT_STYLE_HEADER).setOrigin(0.5, 0));
    group.add(this.add.text(mX + mW / 2, mY + 28, "This wipes all progress and starts fresh.", {
      ...TEXT_STYLE_LABEL, wordWrap: { width: mW - 16 },
    }).setOrigin(0.5, 0));

    const cancelBtn = this.add.rectangle(mX + 70, mY + mH - 14, 100, 18, 0x999977)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    group.add(cancelBtn);
    group.add(this.add.text(mX + 70, mY + mH - 14, "CANCEL", { fontSize: "9px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5));
    cancelBtn.on("pointerdown", () => { group.destroy(true); });

    const confirmBtn = this.add.rectangle(mX + 184, mY + mH - 14, 96, 18, P.WARNING_RED)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    group.add(confirmBtn);
    group.add(this.add.text(mX + 184, mY + mH - 14, "YES, RESET", { fontSize: "9px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5));
    confirmBtn.on("pointerdown", () => {
      group.destroy(true);
      resetSave(this.storage);
      // Also clear tutorial-seen (W9: same storage, so tutorial re-shows after any reset)
      this.storage.removeItem(this.TUTORIAL_KEY);
      this.state = createState(1);
      this.playtimeSeconds = 0;
      this.tutorialStep = -1; // reset tutorial tracking
      this.showToast("Save reset — starting fresh.");
      this.updateHUD();
      // Show tutorial step 0 after reset
      this.time.delayedCall(600, () => this.showTutorialStep(0));
    });
  }

  // ---------------------------------------------------------------------------
  // First-run tutorial (Wave 3)
  //
  // Three dismissible speech-bubble steps; Legsy as guide.
  // Never blocks input. Gate-compliant: no nagging repeats (DARK_PATTERN_GATE A.6).
  // Steps fire only when tutorialStep >= 0 (set on fresh start only).
  // Each step can be dismissed by clicking its "skip" area or by performing
  // the associated action (advanceTutorialOnAction).
  // State persisted in `dmn_tutorial_seen` key after step 2 completes.
  // ---------------------------------------------------------------------------

  private showTutorialStep(step: number): void {
    if (this.tutorialStep === -2) return; // permanently done
    this.dismissTutorial();

    this.tutorialStep = step;

    const W = this.scale.width;
    const H = this.scale.height;

    // Step definitions: message, point-at hint (x,y), arrow direction
    type StepDef = { msg: string; hintX: number; hintY: number };
    const steps: StepDef[] = [
      {
        msg: "Buy raw peanuts\nto get started! →",
        hintX: this.buyBtnRef ? this.buyBtnRef.x : W - 100,
        hintY: this.buyBtnRef ? this.buyBtnRef.y - 30 : H * 0.55,
      },
      {
        msg: "Start a roast!\nTap an empty slot. →",
        hintX: 90,
        hintY: 55,
      },
      {
        msg: "Watch the report\ntonight — that's where\nthe real lesson is!",
        hintX: W - 60,
        hintY: H - 38,
      },
    ];

    if (step >= steps.length) {
      this.markTutorialDone();
      return;
    }

    const def = steps[step];
    const bubbleW = 180;
    const bubbleH = 54;

    // Bubble position: bottom-centre of screen, slightly left
    const bX = W / 2 - bubbleW / 2;
    const bY = H * 0.62;

    this.tutorialGroup = this.add.group();

    // --- Legsy guide icon in bubble ---
    const legsyParts = drawLegsy(this, bX + 16, bY + bubbleH - 4, 0.45);
    for (const p of legsyParts) this.tutorialGroup.add(p as Phaser.GameObjects.GameObject);

    // --- Bubble background ---
    const bg = this.add.rectangle(
      bX + bubbleW / 2, bY + bubbleH / 2,
      bubbleW, bubbleH,
      P.PANEL_BG,
    ).setStrokeStyle(2, P.PANEL_BORDER).setAlpha(0.97);
    this.tutorialGroup.add(bg);

    // Arrow pointer toward target
    const arrowX = def.hintX < W / 2 ? bX + 10 : bX + bubbleW - 10;
    const arrowY = bY - 6;
    const tail = this.add.triangle(
      arrowX, arrowY,
      -6, 0, 6, 0, 0, -10,
      P.PANEL_BORDER,
    );
    this.tutorialGroup.add(tail);

    // Step counter label
    this.tutorialGroup.add(
      this.add.text(bX + 30, bY + 4, `(${step + 1}/3)`, {
        fontSize: "6px", color: "#8B6F47", fontFamily: "monospace",
      })
    );

    // Message text
    const txt = this.add.text(bX + 30, bY + 14, def.msg, {
      fontSize: "7px", color: "#2C2416", fontFamily: "monospace",
      wordWrap: { width: bubbleW - 36 },
    });
    this.tutorialGroup.add(txt);

    // Tap-to-skip label
    const skipTxt = this.add.text(bX + bubbleW - 4, bY + bubbleH - 8, "[tap to skip]", {
      fontSize: "5px", color: "#8B6F47", fontFamily: "monospace",
    }).setOrigin(1, 0);
    this.tutorialGroup.add(skipTxt);

    // Invisible overlay for tap-to-skip (entire bubble is tappable)
    const skipHit = this.add.rectangle(
      bX + bubbleW / 2, bY + bubbleH / 2,
      bubbleW, bubbleH,
      0x000000, 0,
    ).setInteractive({ cursor: "pointer" });
    this.tutorialGroup.add(skipHit);
    skipHit.on("pointerdown", () => {
      // Skip to next step
      this.advanceTutorialOnAction(this.tutorialStep);
    });
  }

  /**
   * If the tutorial is currently on `requiredStep`, advance to the next step
   * (or finish if on the last step).  Called from action handlers.
   */
  private advanceTutorialOnAction(requiredStep: number): void {
    if (this.tutorialStep !== requiredStep) return;

    const nextStep = requiredStep + 1;
    const TOTAL_STEPS = 3;

    if (nextStep >= TOTAL_STEPS) {
      this.markTutorialDone();
    } else {
      // Short delay before showing next bubble so the action's own UI appears first
      this.time.delayedCall(300, () => this.showTutorialStep(nextStep));
    }
  }

  private markTutorialDone(): void {
    this.tutorialStep = -2; // sentinel: permanently done this session
    this.dismissTutorial();
    // W10: wrap in try/catch; storage may throw if blocked.
    // safeStorage() normally handles this, but the in-memory fallback can't
    // persist across sessions anyway — the try/catch prevents triggerEndOfDay
    // from wedging if reportOpen is set before this line runs.
    try { this.storage.setItem(this.TUTORIAL_KEY, "1"); } catch { /* best-effort */ }
  }

  private dismissTutorial(): void {
    if (this.tutorialGroup) {
      this.tutorialGroup.destroy(true);
      this.tutorialGroup = undefined;
    }
  }
}
