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
  balanceSheet,
  buyBrandCampaign,
  buyAutoSell,
  buyPermit,
  setDistrict,
  dayFactorFor,
  weatherFactorFor,
  type RescuePath,
} from "../sim/engine.js";
import { weatherForDay, WEATHER_LABEL } from "../data/economy.js";
import { ACHIEVEMENTS, ACHIEVEMENT_TOTAL } from "../data/achievements.js";
import { LORE_TOTAL_COUNT } from "../data/lore.js";
import { COMEBACK_TIERS } from "../data/comebacks.js";
import type { SimState, DayReport } from "../sim/types.js";
import { tryLoad, trySave, resetSave, safeStorage, serialize, importEnvelopeText } from "../sim/persistence.js";
import { LORE_BY_ID } from "../data/lore.js";
import { COMEBACK_BY_ID } from "../data/comebacks.js";
import { AFTERMATH_BEATS, type AftermathPath } from "../data/rescue_aftermath.js";
import { GLOSSARY, GLOSSARY_DISCLAIMER } from "../data/glossary.js";
import {
  prefsInit,
  isReducedMotion,
  isColorblindCues,
  isLargeText,
  toggleReducedMotion,
  toggleColorblindCues,
  toggleLargeText,
  marginCue,
  scaledFont,
} from "./prefs.js";
import {
  textStyleBody,
  textStyleLabel,
  textStyleHeader,
  textStyleGreen,
  textStyleRed,
  monoTextStyle,
} from "./textStyles.js";
import { drawLegsy } from "./legsy.js";
import { drawFoodTruck, SMOKE } from "./truck.js";
import { drawNpc, type NpcArchetype } from "./npcs.js";
import {
  audioInit,
  toggleMute,
  isMuted,
  playCoinPop,
  playBatchReady,
  playDayEnd,
  playButtonTick,
  loadMutePref,
} from "./audio.js";
import { isMusicOn, toggleMusic, loadMusicPref, startMusic, setMusicMode } from "./music.js";
import { addSprite, SPR } from "./sprites.js";

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
  BRAND_CAMPAIGN_LORE_THRESHOLD,
  BRAND_CAMPAIGN_COST,
  AUTO_SELL_COST,
  supplierLevelFor,
  supplierDiscountFor,
  SUPPLIER_LEVEL_THRESHOLDS,
  RESCUE_LOAN_PRINCIPAL,
  RESCUE_LOAN_FEE_RATE,
  RESCUE_LOAN_FEE_RATE_REPEAT,
  RESCUE_LOAN_DUE_DAYS,
  RESCUE_PREORDER_LBS,
  RESCUE_PREORDER_CASH,
  RESCUE_PREORDER_LBS_REPEAT,
  RESCUE_PREORDER_CASH_REPEAT,
  DISTRICT_CONFIGS,
  DEREK_PRICE_TOLERANCE,
  type RecipeId,
  type RoasterTier,
  type DistrictId,
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

/** Palette D — Office Quarter (ART_BIBLE district swap; programmer-art stand-ins). */
const P_OFFICE = {
  SKY:      0xB8C4D0,  // overcast urban sky
  GROUND:   0x7D848C,  // concrete sidewalk
  BUILDING: 0x5A6269,  // office block fill
  ACCENT:   0x1C3A47,  // suit-blue window band
  LAMP:     0xFDB813,  // street-lamp warm accent (Palette B coin gold)
} as const;

// Text style presets — scaled via textStyles.ts (DM-W2 large-text pref)

// ---------------------------------------------------------------------------
// Coin pop animation helper (fires on each sale event)
// ---------------------------------------------------------------------------

interface CoinPop {
  // Arc fallback or the code-generated coin sprite — both support
  // setAlpha / .y / .destroy, which is all tickCoinPops touches.
  circle: Phaser.GameObjects.Arc | Phaser.GameObjects.Image;
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
  container: Phaser.GameObjects.Container;
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
  private txtDistrictBanner!: Phaser.GameObjects.Text;
  private derekHudChip!: Phaser.GameObjects.Text;

  // ---- District backdrop (DMN-2 palette swap) ----------------------------
  private backdropSky!: Phaser.GameObjects.Rectangle;
  private backdropGround!: Phaser.GameObjects.Rectangle;
  private marketDeco: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc> = [];
  private officeDeco: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc> = [];
  private lastBackdropDistrict: DistrictId | null = null;
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

  // ---- Milestone celebration overlay (one at a time; non-blocking) -------
  private celebrationGroup?: Phaser.GameObjects.Group;
  private celebrationTimer?: Phaser.Time.TimerEvent;

  // ---- Ambient NPC data --------------------------------------------------
  private npcs: NpcData[] = [];

  // ---- Truck (DMN-2b) ----------------------------------------------------
  private truckContainer?: Phaser.GameObjects.Container;
  private truckBaseY = 195;
  private truckBouncePhase = 0;
  private smokeOriginX = 0;

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

  // ---- District / routes modal (P1.5 — DMN-1) ----------------------------
  private districtModalGroup?: Phaser.GameObjects.Group;
  private districtModalOpen = false;

  // ---- Rescue arc modal state (Wave 5) ------------------------------------
  private rescueModalGroup?: Phaser.GameObjects.Group;
  private rescueModalOpen = false;

  // Books panel (ledger + balance sheet)
  private booksModalGroup?: Phaser.GameObjects.Group;
  private booksModalOpen = false;

  // Goals panel (achievements + lore/comeback collection — wave 6)
  private goalsModalGroup?: Phaser.GameObjects.Group;
  private goalsModalOpen = false;

  // Settings + Glossary panels (Polish & Pedagogy wave)
  private settingsModalGroup?: Phaser.GameObjects.Group;
  private settingsModalOpen = false;
  private glossaryModalGroup?: Phaser.GameObjects.Group;
  private glossaryModalOpen = false;

  // Rescue aftermath beats: queued durably in state.pendingAftermath at
  // endOfDay, shown one at a time after the day report closes (and before any
  // new rescue offer). The scene reads/drains state.pendingAftermath directly.
  private aftermathModalGroup?: Phaser.GameObjects.Group;
  private aftermathModalOpen = false;
  /**
   * RT5-2: true across the entire post-report chain (aftermath beats → rescue
   * offer), including the 300ms delayedCall gaps where no modal is on screen.
   * Gates the sim tick AND the HUD buttons so a click in a gap can't open a
   * second day report or stack a panel under a pending beat.
   */
  private inPostReportChain = false;
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


    // ---- Backdrop — palette swaps per district (DMN-2 / ART_BIBLE) ----------
    this.backdropSky = this.add.rectangle(W / 2, 65, W, 130, P.SKY);
    this.backdropGround = this.add.rectangle(W / 2, 195, W, 140, P.GROUND);

    // Farmers' Market deco (stall + trees)
    this.marketDeco.push(this.add.rectangle(80, 160, 80, 60, P.STALL));
    this.marketDeco.push(this.add.rectangle(80, 131, 80, 4, P.AWNING));
    this.marketDeco.push(this.add.circle(30, 100, 18, P.TREE));
    this.marketDeco.push(this.add.circle(440, 90, 22, P.TREE));
    this.marketDeco.push(this.add.circle(390, 110, 14, P.TREE));

    // Office Quarter deco (building silhouettes + lamp accent)
    this.officeDeco.push(this.add.rectangle(55, 155, 70, 90, P_OFFICE.BUILDING));
    this.officeDeco.push(this.add.rectangle(55, 118, 70, 8, P_OFFICE.ACCENT));
    this.officeDeco.push(this.add.rectangle(420, 148, 90, 100, P_OFFICE.BUILDING));
    this.officeDeco.push(this.add.rectangle(420, 108, 90, 10, P_OFFICE.ACCENT));
    this.officeDeco.push(this.add.rectangle(250, 162, 60, 75, P_OFFICE.BUILDING));
    this.officeDeco.push(this.add.circle(200, 175, 4, P_OFFICE.LAMP));
    this.officeDeco.push(this.add.rectangle(198, 168, 2, 14, P_OFFICE.LAMP));
    for (const d of this.officeDeco) d.setVisible(false);

    // ---- Truck (DMN-2b — ART_BIBLE food truck + idle bounce) --------------
    const truckX = W / 2 + 60;
    const truckY = 195;
    this.truckBaseY = truckY;
    this.smokeOriginX = truckX;

    const truck = drawFoodTruck(this, truckX, truckY);
    this.truckContainer = truck.container;

    // Legsy on side panel (scale down to fit beside peanut graphic)
    drawLegsy(this, truckX - 8, truckY - 1, 0.55);

    // ---- Smoke wisps (P1_SPRITE_SPEC #2) ----------------------------------
    for (let i = 0; i < 3; i++) {
      const anchor = truck.smokeAnchors[i];
      const c = this.add.circle(anchor.x, anchor.y, 5, SMOKE);
      c.setAlpha(0);
      this.smokeCircles.push(c);
    }

    // ---- NPC ambient customers (DMN-2b silhouettes) -----------------------
    const npcDefs: Array<{ x: number; y: number; archetype: NpcArchetype; shirt: number }> = [
      { x: 200, y: 200, archetype: "lecturer", shirt: P.NPC_SHIRT_A },
      { x: 260, y: 205, archetype: "parent", shirt: P.NPC_SHIRT_B },
      { x: 320, y: 202, archetype: "worker", shirt: P.NPC_SUIT },
    ];

    for (const def of npcDefs) {
      const handle = drawNpc(this, def.archetype, def.x, def.y, def.shirt);
      this.npcs.push({
        x: def.x,
        y: def.y,
        dir: Math.random() > 0.5 ? 1 : -1,
        speed: 15 + Math.random() * 10,
        container: handle.container,
      });
    }

    // ---- HUD top bar -------------------------------------------------------
    // Background strip
    this.add.rectangle(W / 2, 8, W, 16, P.PANEL_BORDER);

    this.txtDay = this.add.text(6, 2, "Day 1", {
      ...textStyleBody(), color: "#F5DEB3",
    });

    // W4: day-of-week label (predictable, visible — DARK_PATTERN_GATE §A.1 compliant)
    this.txtDayOfWeek = this.add.text(48, 2, "Monday", {
      ...textStyleLabel(), color: "#C0A060",
    });

    this.txtDistrictBanner = this.add.text(W / 2, 2, "FARMERS' MARKET ▾", {
      ...textStyleLabel(), color: "#FF9800",
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.txtDistrictBanner.on("pointerdown", () => {
      if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.districtModalOpen && !this.rescueModalOpen) {
        this.openDistrictModal();
      }
    });
    this.txtDistrictBanner.on("pointerover", () => this.txtDistrictBanner.setAlpha(0.85));
    this.txtDistrictBanner.on("pointerout", () => this.txtDistrictBanner.setAlpha(1.0));

    this.txtCash = this.add.text(W - 6, 2, "Cash: $50.00", {
      ...textStyleBody(), color: "#FFD700",
    }).setOrigin(1, 0);

    // ---- Lore counter (Wave 2: collection tease, no pressure framing) -------
    // Positioned below the top bar at the right edge; visible but unobtrusive.
    // Denominator = unlocked pool size (honest; grows with dayNumber tier gates).
    this.txtLoreCounter = this.add.text(W - 6, 18, "Lore: 0/6", {
      ...textStyleLabel(), color: "#C0A060",
    }).setOrigin(1, 0);

    // ---- Rescue arc HUD chip (Wave 5) — neutral framing, visible while debt/obligation active --
    // Positioned below the lore counter; hidden when no active debt.
    this.rescueHudChip = this.add.text(W - 6, 28, "", {
      fontSize: "6px", color: "#8B6F47", fontFamily: "monospace",
    }).setOrigin(1, 0).setVisible(false);

    this.derekHudChip = this.add.text(W - 6, 38, "", {
      fontSize: "6px", color: "#1C3A47", fontFamily: "monospace",
    }).setOrigin(1, 0).setVisible(false);

    // ---- Roast Queue Panel (P1_SPRITE_SPEC #13) ----------------------------
    // Panel: 160×80 px, top-left area at x=5, y=20
    const qX = 5, qY = 20;
    const qW = 160, qH = 80;
    this.add.rectangle(qX + qW / 2, qY + qH / 2, qW, qH, P.PANEL_BG)
      .setStrokeStyle(1, P.PANEL_BORDER);
    this.add.text(qX + 4, qY + 3, "ROAST QUEUE", textStyleHeader());

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
      const slotLabel = this.add.text(sx + 3, sy + 3, `Slot ${i + 1}: [Empty] — tap to roast`, textStyleLabel());

      this.slotRects.push(slotRect);
      this.slotLabels.push(slotLabel);
      this.slotBars.push(bar);
      this.slotBarBgs.push(barBg);

      const slotIndex = i;
      slotRect.on("pointerdown", () => {
        if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.districtModalOpen && !this.rescueModalOpen) {
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
    this.txtRawStock     = this.add.text(qX + 4, invY + 3, "Raw: 20 lbs", textStyleLabel());
    this.txtRoastedStock = this.add.text(qX + 84, invY + 3, "Roasted: 0 lbs", textStyleLabel());

    // ---- Price control panel -----------------------------------------------
    // Right-side panel: x=330, y=20, 145×80
    const pX = 330, pY = 20;
    const pW = 145, pH = 86;
    this.add.rectangle(pX + pW / 2, pY + pH / 2, pW, pH, P.PANEL_BG)
      .setStrokeStyle(1, P.PANEL_BORDER);
    this.add.text(pX + 4, pY + 3, "PRICE / LB", textStyleHeader());

    this.txtPrice = this.add.text(pX + 4, pY + 16, `$${DEFAULT_SELL_PRICE.toFixed(2)}`, {
      ...textStyleBody(), fontSize: scaledFont(11),
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
    this.add.text(pX + 72, pY + 29, `$${PRICE_MIN}–$${PRICE_MAX}`, textStyleLabel());

    // Demand hint (updates with price)
    this.txtDemandHint = this.add.text(pX + 4, pY + 50, "", textStyleLabel());

    // Margin hint
    this.add.text(pX + 4, pY + 74, "HEALTHY >60%", { ...textStyleLabel(), color: "#4A7C4E" });

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
      if (!this.reportOpen && !this.rescueModalOpen && !this.districtModalOpen) {
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
      if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.districtModalOpen && !this.rescueModalOpen) {
        this.openUpgradesModal();
      }
    });
    upgradesBtn.on("pointerover", () => upgradesBtn.setAlpha(0.85));
    upgradesBtn.on("pointerout",  () => upgradesBtn.setAlpha(1.0));

    // ---- BOOKS button (Ledger v1: daily P&L + balance sheet) ----------------
    const booksBtnY = upgBtnY + 24;
    const booksBtn = this.add.rectangle(buyBtnX + 68, booksBtnY + 10, 137, 20, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(buyBtnX + 68, booksBtnY + 10, "BOOKS", {
      fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace",
    }).setOrigin(0.5);
    booksBtn.on("pointerdown", () => {
      if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.districtModalOpen && !this.rescueModalOpen && !this.aftermathModalOpen && !this.goalsModalOpen) {
        this.openBooksModal();
      }
    });
    booksBtn.on("pointerover", () => booksBtn.setAlpha(0.85));
    booksBtn.on("pointerout",  () => booksBtn.setAlpha(1.0));

    // ---- GOALS button (achievements + lore/comeback collection — wave 6) ----
    const goalsBtnY = booksBtnY + 24;
    const goalsBtn = this.add.rectangle(buyBtnX + 68, goalsBtnY + 10, 137, 20, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(buyBtnX + 68, goalsBtnY + 10, "GOALS", {
      fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace",
    }).setOrigin(0.5);
    goalsBtn.on("pointerdown", () => {
      if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.districtModalOpen && !this.rescueModalOpen && !this.aftermathModalOpen && !this.booksModalOpen) {
        this.openGoalsModal();
      }
    });
    goalsBtn.on("pointerover", () => goalsBtn.setAlpha(0.85));
    goalsBtn.on("pointerout",  () => goalsBtn.setAlpha(1.0));

    // ---- Day progress bar --------------------------------------------------
    const dpY = H - 18;
    this.add.rectangle(W / 2, dpY + 5, W, 18, P.PANEL_BORDER);
    this.add.text(6, dpY, "Day progress:", textStyleLabel()).setStyle({ color: "#F5DEB3" });
    this.txtDayProgress = this.add.text(100, dpY, "0%  6am", textStyleLabel()).setStyle({ color: "#F5DEB3" });

    // End-of-day button (manual trigger for testing — day also ends when clock fills)
    const endBtn = this.add.rectangle(W - 50, dpY + 5, 88, 14, 0x556644)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(W - 50, dpY + 5, "END DAY", { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5);
    endBtn.on("pointerdown", () => { if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.districtModalOpen && !this.rescueModalOpen) this.triggerEndOfDay(); });

    // ---- Reset Save button (spec req; tucked in bottom-left corner) --------
    // Player-initiated only — confirm dialog prevents accidents. (DARK_PATTERN_GATE §B.3)
    const resetBtn = this.add.rectangle(28, dpY + 5, 48, 14, 0x664444)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(28, dpY + 5, "RESET", { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5);
    resetBtn.on("pointerdown", () => {
      if (this.reportOpen || this.supplyModalOpen || this.roastModalOpen || this.upgradesModalOpen || this.districtModalOpen || this.rescueModalOpen) return;
      this.showResetConfirm();
    });

    // Load accessibility/display prefs BEFORE the first HUD render (colorblind
    // cue is read in updateHUD; reduced-motion in the animation helpers).
    prefsInit(this.storage);
    // RT F1: sync the saved mute pref so the Settings Sound toggle reflects it
    // (no AudioContext yet — that waits for the first gesture).
    loadMutePref(this.storage);
    // Same for the music pref so the Settings Music toggle reflects the save.
    // If the player arrived here without passing the title (e.g. scene.restart
    // from the Large-text toggle), re-assert playback to match their pref.
    loadMusicPref(this.storage);
    if (isMusicOn()) startMusic("day");

    // Initial HUD render
    this.updateHUD();

    // ---- Settings / menu button (Polish & Pedagogy) -----------------------
    // Consolidates mute + accessibility toggles + the Glossary. Sits where the
    // lone mute button used to be (bottom-right of the HUD bar).
    const dpY2 = H - 18;
    const setX = W - 118; // RT F2: clear of the END DAY button (centered at W-50)
    const settingsBtn = this.add.rectangle(setX, dpY2 + 5, 36, 14, 0x445566)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(setX, dpY2 + 5, "⚙ MENU",
      { fontSize: "6px", color: "#F5DEB3", fontFamily: "monospace" }
    ).setOrigin(0.5);
    settingsBtn.on("pointerdown", () => {
      if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.districtModalOpen && !this.rescueModalOpen && !this.booksModalOpen && !this.goalsModalOpen && !this.aftermathModalOpen && !this.inPostReportChain) {
        this.openSettingsModal();
      }
    });
    settingsBtn.on("pointerover", () => settingsBtn.setAlpha(0.85));
    settingsBtn.on("pointerout",  () => settingsBtn.setAlpha(1.0));

    // ---- First-run tutorial init (Wave 3) ---------------------------------
    // Only show tutorial if no save existed at load time (fresh player).
    // Uses a parallel storage key so save schema is untouched.
    if (!loadResult.ok && this.storage.getItem(this.TUTORIAL_KEY) === null) {
      // Short delay so the backdrop finishes rendering before the first bubble
      this.time.delayedCall(400, () => this.showTutorialStep(0));
    }

    // ---- RT5-1: drain any aftermath beats persisted from a prior session ----
    // If the player closed the tab mid-queue, the beats are still in
    // state.pendingAftermath — show them now so none are silently lost.
    if (this.state.pendingAftermath.length > 0) {
      this.inPostReportChain = true;
      this.time.delayedCall(600, () => this.afterReportFlow());
    }

    // ---- Desktop keyboard controls (Steam / Windows expectation) ----------
    this.setupKeyboard();
  }

  // ---------------------------------------------------------------------------
  // Keyboard controls
  //
  // Desktop players expect to drive the whole game from the keyboard. Every
  // shortcut routes through the SAME guards as the on-screen buttons so a key
  // press can never open a modal on top of a forced-choice flow (day report,
  // rescue arc, tutorial, aftermath). ESC is universal back/cancel for the
  // optional info modals; it deliberately does NOT dismiss the day report or
  // rescue arc (those require a decision). Headless/no-keyboard environments
  // (boot smoke test) are handled by the `?.` guard.
  // ---------------------------------------------------------------------------

  /** True when a blocking modal or scripted flow owns the screen. */
  private isUIBlocked(): boolean {
    return (
      this.reportOpen || this.supplyModalOpen || this.roastModalOpen ||
      this.upgradesModalOpen || this.districtModalOpen || this.rescueModalOpen ||
      this.booksModalOpen || this.goalsModalOpen || this.settingsModalOpen ||
      this.glossaryModalOpen || this.aftermathModalOpen || this.inPostReportChain ||
      this.tutorialStep >= 0
    );
  }

  /** Close the topmost dismissible info modal. Returns true if one was closed. */
  private closeTopModal(): boolean {
    if (this.glossaryModalOpen) { this.closeGlossaryModal(); return true; }
    if (this.settingsModalOpen) { this.closeSettingsModal(); return true; }
    if (this.supplyModalOpen) { this.closeSupplyModal(); return true; }
    if (this.roastModalOpen) { this.closeRoastModal(); return true; }
    if (this.upgradesModalOpen) { this.closeUpgradesModal(); return true; }
    if (this.districtModalOpen) { this.closeDistrictModal(); return true; }
    if (this.booksModalOpen) { this.closeBooksModal(); return true; }
    if (this.goalsModalOpen) { this.closeGoalsModal(); return true; }
    return false;
  }

  private setupKeyboard(): void {
    const kb = this.input?.keyboard;
    if (!kb) return; // headless renderer / no keyboard — silently skip

    // ESC: back/cancel. Closes an open info modal, or opens the menu when idle.
    kb.on("keydown-ESC", () => {
      if (this.closeTopModal()) return;
      if (!this.isUIBlocked()) { playButtonTick(); this.openSettingsModal(); }
    });

    // Single-key shortcuts for each action, gated so they never stack.
    const open = (fn: () => void) => () => {
      if (this.isUIBlocked()) return;
      playButtonTick();
      fn();
    };
    kb.on("keydown-S", open(() => this.openSupplyModal()));
    kb.on("keydown-R", open(() => this.handleSlotClick(0)));
    kb.on("keydown-U", open(() => this.openUpgradesModal()));
    kb.on("keydown-B", open(() => this.openBooksModal()));
    kb.on("keydown-G", open(() => this.openGoalsModal()));
    kb.on("keydown-D", open(() => this.openDistrictModal()));
    kb.on("keydown-M", open(() => this.openSettingsModal()));

    // Mute / music quick toggles work even with a modal open (volume is global).
    kb.on("keydown-N", () => { audioInit(this.storage); toggleMute(this.storage); this.updateHUD(); });
    kb.on("keydown-J", () => { audioInit(this.storage); toggleMusic(this.storage); });

    // ENTER ends the trading day early — same guard as the END DAY button.
    kb.on("keydown-ENTER", () => { if (!this.isUIBlocked()) this.qaClickEndDay(); });
  }

  // ---------------------------------------------------------------------------
  // update — Phaser game loop
  // ---------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    // Track wall-clock playtime (excludes offline time; used by trySave meta)
    this.playtimeSeconds += delta / 1_000;

    if (this.reportOpen || this.supplyModalOpen || this.roastModalOpen || this.upgradesModalOpen || this.districtModalOpen || this.rescueModalOpen || this.booksModalOpen || this.goalsModalOpen || this.settingsModalOpen || this.glossaryModalOpen || this.aftermathModalOpen || this.inPostReportChain) return;

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
        this.showGagBubble(ev.detail.loreId as string, ev.detail.comebackId as string | undefined);
      }
      if (ev.kind === "comeback_unlocked") {
        // Earned progression — a celebratory flourish (factual, no pressure).
        const label = ev.detail.label as string;
        const threshold = ev.detail.threshold as number;
        this.showCelebration(`New comebacks: "${label}"`, `${threshold} lore entries collected`);
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

    // Cross-fade the soundtrack into the warmer Evening arrangement during the
    // back third of the trading day (SOUND_DESIGN.md §C "Day → Evening"). The
    // setMusicMode call is a cheap no-op once the mode already matches.
    setMusicMode(
      this.state.dayElapsedSeconds >= DAY_DURATION_SECONDS * 0.62 ? "evening" : "day",
    );

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
    const dayFactor = dayFactorFor(this.state.dayNumber, this.state.currentDistrict);
    const dowLabel = DAY_NAMES[dowIdx];
    // Show factor + today's weather + a 1-day forecast (predictable, never
    // pressuring — DARK_PATTERN_GATE §A.1; the forecast means no surprise/FOMO).
    const todayW = WEATHER_LABEL[weatherForDay(this.state.dayNumber, this.state.weatherSeed)];
    const tomorrowW = WEATHER_LABEL[weatherForDay(this.state.dayNumber + 1, this.state.weatherSeed)];
    this.txtDayOfWeek.setText(`${dowLabel} ×${dayFactor.toFixed(2)} · ${todayW}  (tmrw: ${tomorrowW})`);
    this.txtLoreCounter.setText(`Lore: ${this.state.gagsSeen.size}/${unlockedLoreCount}`);
    this.txtRawStock.setText(`Raw: ${this.state.rawStockLbs.toFixed(1)} lbs`);
    this.txtRoastedStock.setText(`Roasted: ${this.state.roastedStockLbs.toFixed(1)} lbs`);
    this.txtPrice.setText(`$${this.state.sellPrice.toFixed(2)}`);

    // Demand hint at current price (now weather-aware so it matches live demand)
    this.updateDistrictBackdrop();

    const distCfg = DISTRICT_CONFIGS[this.state.currentDistrict];
    this.txtDistrictBanner.setText(`${distCfg.label.toUpperCase()} ▾`);
    if (this.state.currentDistrict === "office_quarter") {
      const derekLine = this.state.derekLastPrice !== null
        ? `Derek: ${this.state.derekConsistencyCounter}d streak · ±${(DEREK_PRICE_TOLERANCE * 100).toFixed(0)}% price`
        : "Derek: office regular — keep price steady";
      this.derekHudChip.setText(derekLine).setVisible(true);
    } else {
      this.derekHudChip.setVisible(false);
    }

    const demandLbsHr = this.projectedDemandForUI(this.state.sellPrice);
    // F7: derive COGS from economy constants, not a hardcoded literal
    const cogsPerLbClassic = RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb;
    const marginPct = this.state.sellPrice > 0
      ? ((this.state.sellPrice - cogsPerLbClassic) / this.state.sellPrice) * 100
      : 0;
    // RT F6: derive the color bucket from marginCue() so the color thresholds
    // and the word cue can never drift apart (single source of truth).
    const cueWord = marginCue(marginPct);
    const marginColor = cueWord === "healthy" ? "#4A7C4E" : cueWord === "tight" ? "#C08A00" : "#C0392B";
    // WCAG 1.4.1: when colorblind cues are on, the color-coded margin also
    // carries a word so color isn't the only signal.
    const cue = isColorblindCues() ? ` (${cueWord})` : "";
    this.txtDemandHint.setText(
      `~${demandLbsHr.toFixed(0)} lbs/hr  margin ${marginPct.toFixed(0)}%${cue}`
    ).setStyle({ ...textStyleLabel(), color: marginColor });

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
        label.setText(`Slot ${i + 1}: [Empty] — tap to roast`).setStyle(textStyleLabel());
        bar.setVisible(false);
        barBg.setVisible(false);
      } else if (slot.status === "roasting") {
        rect.setFillStyle(P.SLOT_ROAST);
        // F3: secondsRemaining is in sim-time; divide by SIM_TIME_SCALE for real-time display
        const realSecsLeft = Math.ceil(slot.secondsRemaining / SIM_TIME_SCALE);
        const progress = 1 - slot.secondsRemaining / Math.max(1, slot.totalSeconds);
        label.setText(`Slot ${i + 1}: ${slot.batchLbs}lb roasting… ${realSecsLeft}s left`).setStyle(textStyleLabel());
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
        label.setText(`Slot ${i + 1}: ${slot.batchLbs}lb READY ✓`).setStyle({ ...textStyleLabel(), color: "#2C6624" });
        bar.setVisible(false);
        barBg.setVisible(false);
      }
    }

    // Low-stock warning on raw peanuts (text color shift)
    if (this.state.rawStockLbs < 5) {
      this.txtRawStock.setStyle({ ...textStyleLabel(), color: "#C0392B" });
    } else {
      this.txtRawStock.setStyle(textStyleLabel());
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
      } else if (debt.kind === "preorder_default") {
        parts.push(`Owe Derek $${debt.amountDue.toFixed(2)} — ${daysLeft}d left`);
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
      this.add.text(mX + 6, mY + 6, `ROAST SLOT ${slotIndex + 1}`, textStyleHeader())
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
    this.roastModalGroup.add(this.add.text(mX + 6, mY + 24, "RECIPE", textStyleLabel()));

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
      const demand1   = this.projectedDemandForUI(curPrice, this.roastModalRecipe);
      const marginColor = margin1 >= 60 ? "#4A7C4E" : margin1 >= 45 ? "#C08A00" : "#C0392B";

      // Row B: at optimum price (item 6 — two-row preview)
      const optPrice  = optimumPrice(this.roastModalRecipe, this.state.brandCampaignActive);
      const marginOpt = optPrice > 0 ? ((optPrice - cogs) / optPrice) * 100 : 0;
      const demandOpt = this.projectedDemandForUI(optPrice, this.roastModalRecipe);

      if (previewLines.length >= 5) {
        previewLines[0].setText(`COGS total: $${cogsTotal.toFixed(2)}  Roast: ${roastMins.toFixed(0)} min (sim)`);
        previewLines[1].setText(`at current $${curPrice.toFixed(2)}: margin ${margin1.toFixed(0)}%  ~${demand1.toFixed(0)} lbs/hr`);
        previewLines[1].setStyle({ ...textStyleLabel(), color: marginColor });
        previewLines[2].setText(`at optimum $${optPrice.toFixed(2)}: margin ${marginOpt.toFixed(0)}%  ~${demandOpt.toFixed(0)} lbs/hr`);
        previewLines[2].setStyle({ ...textStyleLabel(), color: "#4A7C4E" });
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
        ...textStyleLabel(), color: textColor,
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
    this.roastModalGroup.add(this.add.text(mX + 6, divY1 + 4, "BATCH SIZE", textStyleLabel()));

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
    const customLabel = this.add.text(bx + 4, batchBtnY, "Custom:", textStyleLabel());
    this.roastModalGroup.add(customLabel);
    batchSizeText = this.add.text(bx + 50, batchBtnY, `${this.roastModalBatchLbs} lbs`, textStyleLabel());
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
    this.roastModalGroup.add(this.add.text(mX + 6, divY2 + 4, "PREVIEW", textStyleLabel()));

    const py = divY2 + 14;
    const p0 = this.add.text(mX + 6, py, "", textStyleLabel());
    const p1 = this.add.text(mX + 6, py + 11, "", textStyleLabel());
    const p2 = this.add.text(mX + 6, py + 22, "", { ...textStyleLabel(), color: "#4A7C4E" });
    const p3 = this.add.text(mX + 6, py + 33, "", textStyleLabel());
    const p4 = this.add.text(mX + 6, py + 44, "", textStyleLabel()); // error line
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
        ).setStyle({ ...textStyleLabel(), color: "#C0392B" });
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
    const mW = 320, mH = 234; // auto-sell row added; Save I/O moved to Settings
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
      this.add.text(mX + 6, mY + 5, "UPGRADES — Capital Investment", textStyleHeader())
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
    this.upgradesModalGroup.add(this.add.text(mX + 6, rowY, "ROASTER", { ...textStyleLabel(), color: "#8B6F47" }));
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
        this.add.text(mX + 6, rowY, lineText, { ...textStyleLabel(), color: isCurrent ? "#4A7C4E" : labelColor })
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
    this.upgradesModalGroup.add(this.add.text(mX + 6, rowY, "ROAST QUEUE SLOTS", { ...textStyleLabel(), color: "#8B6F47" }));
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
        this.add.text(mX + 6, rowY, lineText, { ...textStyleLabel(), color: lineColor })
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

    // ---- Section: Brand campaign ("Legumes. Not Nuts." — GDD B4) ----
    // Earned via lore collection; one-time purchase; permanent. No timer, no
    // expiry, no FOMO — the unlock waits forever once earned.
    this.upgradesModalGroup.add(this.add.rectangle(mX + mW / 2, rowY + 2, mW - 8, 1, P.PANEL_BORDER));
    rowY += 8;
    this.upgradesModalGroup.add(this.add.text(mX + 6, rowY, "BRAND", { ...textStyleLabel(), color: "#8B6F47" }));
    rowY += 12;

    const loreCount = this.state.gagsSeen.size;
    if (this.state.brandCampaignActive) {
      this.upgradesModalGroup.add(
        this.add.text(mX + 6, rowY, `  ▶ "Legumes. Not Nuts." campaign — active. Customers accept ~5% higher prices.`, { ...textStyleLabel(), color: "#4A7C4E" })
      );
    } else if (loreCount >= BRAND_CAMPAIGN_LORE_THRESHOLD) {
      this.upgradesModalGroup.add(
        this.add.text(mX + 6, rowY, `    "Legumes. Not Nuts." — flip the gag into the brand (+5% price tolerance)`, textStyleLabel())
      );
      const canAfford = this.state.cash >= BRAND_CAMPAIGN_COST;
      const btnColor = canAfford ? P.AWNING : 0x999977;
      const brandBtn = this.add.rectangle(mX + mW - 46, rowY + 4, 72, 13, btnColor)
        .setStrokeStyle(1, P.PANEL_BORDER)
        .setInteractive({ cursor: canAfford ? "pointer" : "default" });
      this.upgradesModalGroup.add(brandBtn);
      const btnLabel = canAfford
        ? `BUY $${BRAND_CAMPAIGN_COST}`
        : `earn $${(BRAND_CAMPAIGN_COST - this.state.cash).toFixed(0)} more`;
      this.upgradesModalGroup.add(
        this.add.text(mX + mW - 46, rowY + 4, btnLabel, {
          fontSize: "7px",
          color: canAfford ? "#2C2416" : "#666644",
          fontFamily: "monospace",
        }).setOrigin(0.5)
      );
      if (canAfford) {
        brandBtn.on("pointerdown", () => {
          const ev = buyBrandCampaign(this.state);
          if (ev) {
            playButtonTick();
            this.closeUpgradesModal();
            this.showToast(`"Legumes. Not Nuts." is live — the joke is the brand now. Brand equity raises what customers will pay.`);
          }
        });
        brandBtn.on("pointerover", () => brandBtn.setAlpha(0.85));
        brandBtn.on("pointerout",  () => brandBtn.setAlpha(1.0));
      }
    } else {
      // Progress hint — factual, no countdown, no pressure.
      this.upgradesModalGroup.add(
        this.add.text(mX + 6, rowY, `    Collect ${BRAND_CAMPAIGN_LORE_THRESHOLD} unique lore entries to unlock a brand campaign (${loreCount}/${BRAND_CAMPAIGN_LORE_THRESHOLD} so far).`, { ...textStyleLabel(), color: "#999977" })
      );
    }
    rowY += 14;

    // ---- Auto-sell off-peak (GDD C4) — compact single row, cash-gated ----
    this.upgradesModalGroup.add(this.add.rectangle(mX + mW / 2, rowY + 2, mW - 8, 1, P.PANEL_BORDER));
    rowY += 8;
    if (this.state.autoSellEnabled) {
      this.upgradesModalGroup.add(
        this.add.text(mX + 6, rowY, `  ▶ Auto-sell off-peak — leftover roasted sells −10% nightly (less waste).`, { ...textStyleLabel(), color: "#4A7C4E" })
      );
    } else {
      this.upgradesModalGroup.add(
        this.add.text(mX + 6, rowY, `    Auto-sell leftover roasted (−10% at day's end) — less waste, frees cash`, textStyleLabel())
      );
      const canAfford = this.state.cash >= AUTO_SELL_COST;
      const btnColor = canAfford ? P.AWNING : 0x999977;
      const asBtn = this.add.rectangle(mX + mW - 46, rowY + 4, 72, 13, btnColor)
        .setStrokeStyle(1, P.PANEL_BORDER)
        .setInteractive({ cursor: canAfford ? "pointer" : "default" });
      this.upgradesModalGroup.add(asBtn);
      const asLabel = canAfford ? `BUY $${AUTO_SELL_COST}` : `earn $${(AUTO_SELL_COST - this.state.cash).toFixed(0)} more`;
      this.upgradesModalGroup.add(
        this.add.text(mX + mW - 46, rowY + 4, asLabel, {
          fontSize: "7px", color: canAfford ? "#2C2416" : "#666644", fontFamily: "monospace",
        }).setOrigin(0.5)
      );
      if (canAfford) {
        asBtn.on("pointerdown", () => {
          const ev = buyAutoSell(this.state);
          if (ev) {
            playButtonTick();
            this.closeUpgradesModal();
            this.showToast(`Auto-sell on — leftover roasted now sells at 10% off at day's end. Less waste, more working capital.`);
          }
        });
        asBtn.on("pointerover", () => asBtn.setAlpha(0.85));
        asBtn.on("pointerout",  () => asBtn.setAlpha(1.0));
      }
    }
    rowY += 14;

    // ---- Day-factor legend (small, informational, no pressure) ----
    rowY += 2;
    this.upgradesModalGroup.add(this.add.rectangle(mX + mW / 2, rowY + 2, mW - 8, 1, P.PANEL_BORDER));
    rowY += 6;
    this.upgradesModalGroup.add(
      this.add.text(mX + 6, rowY, "THIS WEEK  Mon 0.85 · Tue 0.90 · Wed 0.95 · Thu 1.00 · Fri 1.10 · Sat 1.25 · Sun 1.10", {
        fontSize: "6px", color: "#8B6F47", fontFamily: "monospace",
      })
    );

    // (Save Export/Import relocated to the Settings panel — declutters this modal.)
    this.upgradesModalGroup.add(this.add.text(mX + 6, rowY + 4,
      "Save export/import is now in ⚙ MENU › Settings.",
      { fontSize: "7px", color: "#8B6F47", fontFamily: "monospace" }));

    // Close button at bottom
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

  // ---------------------------------------------------------------------------
  // District / routes modal (P1.5 — DMN-1)
  // Tap the district banner in the HUD to open. Permit purchase + district switch.
  // ---------------------------------------------------------------------------

  private simHourNow(): number {
    return 6 + this.state.dayElapsedSeconds / 3600;
  }

  private projectedDemandForUI(price: number, recipe: RecipeId = "classic_salted"): number {
    return projectedDemand(
      price,
      recipe,
      this.state.brandCampaignActive,
      weatherFactorFor(this.state),
      this.state.currentDistrict,
      this.simHourNow(),
    );
  }

  /** Swap sky/ground palette and district deco when `currentDistrict` changes. */
  private updateDistrictBackdrop(): void {
    if (this.lastBackdropDistrict === this.state.currentDistrict) return;
    this.lastBackdropDistrict = this.state.currentDistrict;
    const isOffice = this.state.currentDistrict === "office_quarter";
    if (isOffice) {
      this.backdropSky.setFillStyle(P_OFFICE.SKY);
      this.backdropGround.setFillStyle(P_OFFICE.GROUND);
    } else {
      this.backdropSky.setFillStyle(P.SKY);
      this.backdropGround.setFillStyle(P.GROUND);
    }
    for (const d of this.marketDeco) d.setVisible(!isOffice);
    for (const d of this.officeDeco) d.setVisible(isOffice);
  }

  private openDistrictModal(): void {
    if (this.districtModalOpen) return;
    this.districtModalOpen = true;
    playButtonTick();

    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 300;
    const mH = 172;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;
    const districtOrder: DistrictId[] = ["farmers_market", "office_quarter"];

    this.districtModalGroup = this.add.group();

    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.55)
      .setInteractive();
    this.districtModalGroup.add(backdrop);

    this.districtModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
        .setStrokeStyle(2, P.PANEL_BORDER)
    );

    this.districtModalGroup.add(
      this.add.text(mX + 6, mY + 5, "ROUTES — Districts", textStyleHeader())
    );

    const closeBtn = this.add.rectangle(mX + mW - 12, mY + 11, 16, 14, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.districtModalGroup.add(closeBtn);
    this.districtModalGroup.add(
      this.add.text(mX + mW - 12, mY + 11, "×", { fontSize: "10px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    closeBtn.on("pointerdown", () => this.closeDistrictModal());

    this.districtModalGroup.add(this.add.rectangle(mX + mW / 2, mY + 21, mW - 8, 1, P.PANEL_BORDER));

    let rowY = mY + 27;
    for (const id of districtOrder) {
      const cfg = DISTRICT_CONFIGS[id];
      const unlocked = this.state.unlockedDistricts.includes(id);
      const here = this.state.currentDistrict === id;

      this.districtModalGroup.add(this.add.text(mX + 6, rowY, cfg.label.toUpperCase(), { ...textStyleLabel(), color: "#8B6F47" }));
      rowY += 10;

      const detailParts = [
        `~${cfg.baseDemandLbsPerHour} lbs/hr base`,
        `anchor $${cfg.basePrice.toFixed(2)}`,
      ];
      if (cfg.lunchRushHour > 0) {
        detailParts.push(`lunch rush ~${cfg.lunchRushHour}:00`);
      }
      this.districtModalGroup.add(this.add.text(mX + 10, rowY, detailParts.join(" · "), textStyleLabel()));
      rowY += 10;

      if (here) {
        this.districtModalGroup.add(this.add.text(mX + 10, rowY, "● Operating here today", { ...textStyleLabel(), color: "#4A7C4E" }));
        if (id === "office_quarter") {
          rowY += 10;
          this.districtModalGroup.add(this.add.text(mX + 10, rowY,
            `Derek likes steady prices (±${(DEREK_PRICE_TOLERANCE * 100).toFixed(0)}%). Streak: ${this.state.derekConsistencyCounter} days.`,
            { ...textStyleLabel(), wordWrap: { width: mW - 20 } }));
        }
        rowY += 14;
      } else if (unlocked) {
        const switchBtn = this.add.rectangle(mX + mW - 52, rowY + 6, 88, 16, 0x556677)
          .setStrokeStyle(1, P.PANEL_BORDER)
          .setInteractive({ cursor: "pointer" });
        this.districtModalGroup.add(switchBtn);
        this.districtModalGroup.add(
          this.add.text(mX + mW - 52, rowY + 6, "SWITCH", { fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
        );
        const targetId = id;
        switchBtn.on("pointerdown", () => {
          const ev = setDistrict(this.state, targetId);
          if (ev) {
            playButtonTick();
            this.closeDistrictModal();
            this.showToast(`Rolled to ${cfg.label} — demand curve updated.`);
          }
        });
        switchBtn.on("pointerover", () => switchBtn.setAlpha(0.85));
        switchBtn.on("pointerout", () => switchBtn.setAlpha(1.0));
        rowY += 18;
      } else if (cfg.permitCost > 0) {
        const canAfford = this.state.cash >= cfg.permitCost;
        const permitBtn = this.add.rectangle(mX + mW - 58, rowY + 6, 100, 16, canAfford ? 0x556677 : 0x888888)
          .setStrokeStyle(1, P.PANEL_BORDER)
          .setInteractive({ cursor: canAfford ? "pointer" : "default" });
        this.districtModalGroup.add(permitBtn);
        this.districtModalGroup.add(
          this.add.text(mX + mW - 58, rowY + 6, `PERMIT $${cfg.permitCost}`, { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
        );
        if (canAfford) {
          const targetId = id;
          permitBtn.on("pointerdown", () => {
            const ev = buyPermit(this.state, targetId);
            if (ev) {
              playButtonTick();
              setDistrict(this.state, targetId);
              this.closeDistrictModal();
              this.showToast(`Permit secured — welcome to ${cfg.label}.`);
            }
          });
          permitBtn.on("pointerover", () => permitBtn.setAlpha(0.85));
          permitBtn.on("pointerout", () => permitBtn.setAlpha(1.0));
        } else {
          this.districtModalGroup.add(this.add.text(mX + 10, rowY + 18, "Need more cash for the permit.", { ...textStyleLabel(), color: "#C0392B" }));
          rowY += 10;
        }
        rowY += 18;
      } else {
        rowY += 4;
      }
    }

    const doneBtn = this.add.rectangle(mX + mW / 2, mY + mH - 12, 80, 16, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.districtModalGroup.add(doneBtn);
    this.districtModalGroup.add(
      this.add.text(mX + mW / 2, mY + mH - 12, "CLOSE", { fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    doneBtn.on("pointerdown", () => this.closeDistrictModal());
    doneBtn.on("pointerover", () => doneBtn.setAlpha(0.85));
    doneBtn.on("pointerout", () => doneBtn.setAlpha(1.0));
  }

  private closeDistrictModal(): void {
    if (this.districtModalGroup) {
      this.districtModalGroup.destroy(true);
      this.districtModalGroup = undefined;
    }
    this.districtModalOpen = false;
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // Books panel (Ledger v1) — balance sheet + daily P&L history
  // Bookkeeping teaching surface: assets = liabilities + equity up top,
  // then the last 7 closed days. Factual numbers only; profit ≠ cash is the
  // through-line (debt column sits NEXT to net, never inside it).
  // ---------------------------------------------------------------------------

  private openBooksModal(): void {
    // RT5-2: never open over a pending post-report chain / aftermath beat.
    if (this.booksModalOpen || this.inPostReportChain || this.aftermathModalOpen || this.reportOpen) return;
    this.booksModalOpen = true;

    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 380, mH = 240;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    this.booksModalGroup = this.add.group();

    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.55)
      .setInteractive();
    this.booksModalGroup.add(backdrop);

    this.booksModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
        .setStrokeStyle(2, P.PANEL_BORDER)
    );

    this.booksModalGroup.add(
      this.add.text(mX + 6, mY + 5, "THE BOOKS — Balance Sheet & Daily Ledger", textStyleHeader())
    );

    // Close [×]
    const closeBtn = this.add.rectangle(mX + mW - 12, mY + 11, 16, 14, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.booksModalGroup.add(closeBtn);
    this.booksModalGroup.add(
      this.add.text(mX + mW - 12, mY + 11, "×", { fontSize: "10px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    closeBtn.on("pointerdown", () => this.closeBooksModal());

    this.booksModalGroup.add(this.add.rectangle(mX + mW / 2, mY + 21, mW - 8, 1, P.PANEL_BORDER));

    // ---- Balance sheet (computed live) ----
    const bs = balanceSheet(this.state);
    let rowY = mY + 26;
    this.booksModalGroup.add(this.add.text(mX + 6, rowY, "BALANCE SHEET (right now)", { ...textStyleLabel(), color: "#8B6F47" }));
    rowY += 11;
    this.booksModalGroup.add(this.add.text(mX + 10, rowY,
      `Assets:      cash $${bs.assets.cash.toFixed(2)} + raw inv $${bs.assets.rawInventoryValue.toFixed(2)} + roasted inv $${bs.assets.roastedInventoryValue.toFixed(2)} = $${bs.assets.total.toFixed(2)}`,
      { ...textStyleLabel(), wordWrap: { width: mW - 20 } }));
    rowY += 11;
    const liabDetail = bs.liabilities.total > 0
      ? `debts $${bs.liabilities.debtsOwed.toFixed(2)} + pre-paid orders $${bs.liabilities.deferredRevenue.toFixed(2)} = $${bs.liabilities.total.toFixed(2)}`
      : "$0.00 — debt-free";
    this.booksModalGroup.add(this.add.text(mX + 10, rowY, `Liabilities: ${liabDetail}`, textStyleLabel()));
    rowY += 11;
    this.booksModalGroup.add(this.add.text(mX + 10, rowY,
      `Equity (what the business is worth on paper): $${bs.equity.toFixed(2)}`,
      { ...textStyleLabel(), color: bs.equity >= 0 ? "#4A7C4E" : "#C0392B" }));
    rowY += 13;

    this.booksModalGroup.add(this.add.rectangle(mX + mW / 2, rowY, mW - 8, 1, P.PANEL_BORDER));
    rowY += 5;

    // ---- Daily ledger table (last 7 closed days) ----
    this.booksModalGroup.add(this.add.text(mX + 6, rowY, "DAILY LEDGER (last 7 closed days)", { ...textStyleLabel(), color: "#8B6F47" }));
    rowY += 11;

    const ledgerRows = this.state.ledger.slice(-7);
    if (ledgerRows.length === 0) {
      this.booksModalGroup.add(this.add.text(mX + 10, rowY, "No closed days yet — finish a day and the ledger starts here.", textStyleLabel()));
      rowY += 12;
    } else {
      // Header row (monospace columns)
      const header = "Day  Revenue    COGS   Fixed     Net    Debt$   Cash end";
      this.booksModalGroup.add(this.add.text(mX + 10, rowY, header, { ...textStyleLabel(), color: "#8B6F47" }));
      rowY += 10;
      const pad = (s: string, w: number) => s.padStart(w);
      for (const e of ledgerRows) {
        const line =
          `${pad(String(e.day), 3)}  ${pad(e.revenue.toFixed(2), 7)} ${pad(e.cogs.toFixed(2), 7)} ${pad(e.fixedCosts.toFixed(2), 7)} ${pad(e.net.toFixed(2), 7)} ${pad(e.debtService > 0 ? e.debtService.toFixed(2) : "—", 7)} ${pad(e.cashAfter.toFixed(2), 9)}`;
        this.booksModalGroup.add(this.add.text(mX + 10, rowY, line, {
          ...textStyleLabel(),
          color: e.net >= 0 ? "#2C2416" : "#C0392B",
        }));
        rowY += 10;
      }
    }

    // Teaching footnote — the profit ≠ cash through-line
    rowY += 2;
    this.booksModalGroup.add(this.add.text(mX + 10, rowY,
      "Note: Net is PROFIT. Debt$ is cash paid on debts — it lowers cash and\nliabilities, but it is not an expense. That's why profit ≠ cash.",
      { ...textStyleLabel(), color: "#5A3A1A" }));

    // Close button at bottom
    const doneBtn = this.add.rectangle(mX + mW / 2, mY + mH - 12, 80, 16, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.booksModalGroup.add(doneBtn);
    this.booksModalGroup.add(
      this.add.text(mX + mW / 2, mY + mH - 12, "CLOSE", { fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    doneBtn.on("pointerdown", () => this.closeBooksModal());
    doneBtn.on("pointerover", () => doneBtn.setAlpha(0.85));
    doneBtn.on("pointerout",  () => doneBtn.setAlpha(1.0));
  }

  private closeBooksModal(): void {
    if (this.booksModalGroup) {
      this.booksModalGroup.destroy(true);
      this.booksModalGroup = undefined;
    }
    this.booksModalOpen = false;
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // Goals panel (wave 6) — achievements + lore/comeback collection.
  // Goals grant NO mechanical bonus (kept off the dark-pattern surface): they
  // surface the player's own progress toward the GDD's plural win-states.
  // ---------------------------------------------------------------------------

  private openGoalsModal(): void {
    if (this.goalsModalOpen || this.inPostReportChain || this.aftermathModalOpen || this.reportOpen) return;
    this.goalsModalOpen = true;

    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 440, mH = 258;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    this.goalsModalGroup = this.add.group();

    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.55)
      .setInteractive();
    this.goalsModalGroup.add(backdrop);
    this.goalsModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
        .setStrokeStyle(2, P.PANEL_BORDER)
    );

    const earned = new Set(this.state.achievementsUnlocked);
    this.goalsModalGroup.add(
      this.add.text(mX + 6, mY + 5, `GOALS & MASTERY — ${earned.size}/${ACHIEVEMENT_TOTAL} achievements`, textStyleHeader())
    );

    // Close [×]
    const closeBtn = this.add.rectangle(mX + mW - 12, mY + 11, 16, 14, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.goalsModalGroup.add(closeBtn);
    this.goalsModalGroup.add(
      this.add.text(mX + mW - 12, mY + 11, "×", { fontSize: "10px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    closeBtn.on("pointerdown", () => this.closeGoalsModal());
    this.goalsModalGroup.add(this.add.rectangle(mX + mW / 2, mY + 21, mW - 8, 1, P.PANEL_BORDER));

    // ---- Left column: achievements ----
    const colLX = mX + 8;
    let lY = mY + 26;
    this.goalsModalGroup.add(this.add.text(colLX, lY, "ACHIEVEMENTS", { ...textStyleLabel(), color: "#8B6F47" }));
    lY += 12;
    // RT6-4: render each row, then advance by its measured height so a wrapped
    // locked-row description can't overlap the CLOSE button at the bottom.
    for (const ach of ACHIEVEMENTS) {
      const got = earned.has(ach.id);
      const mark = got ? "✓" : "○";
      const color = got ? "#4A7C4E" : "#999977";
      // Earned rows show the name; locked rows show the requirement (a goal to chase).
      const text = got ? `${mark} ${ach.name}` : `${mark} ${ach.name} — ${ach.desc}`;
      const t = this.add.text(colLX, lY, text, { ...textStyleLabel(), color, wordWrap: { width: 250 } });
      this.goalsModalGroup.add(t);
      lY += t.height + 2;
    }

    // ---- Right column: collection ----
    const colRX = mX + 270;
    let rY = mY + 26;
    this.goalsModalGroup.add(this.add.text(colRX, rY, "COLLECTION", { ...textStyleLabel(), color: "#8B6F47" }));
    rY += 12;

    // Lore progress
    this.goalsModalGroup.add(this.add.text(colRX, rY, `Legume Lore: ${this.state.gagsSeen.size}/${LORE_TOTAL_COUNT}`, textStyleLabel()));
    rY += 11;
    // Simple progress bar
    const barW = 150, barH = 6;
    this.goalsModalGroup.add(this.add.rectangle(colRX + barW / 2, rY + barH / 2, barW, barH, 0xCCBB99));
    const loreFrac = Math.min(1, this.state.gagsSeen.size / LORE_TOTAL_COUNT);
    this.goalsModalGroup.add(this.add.rectangle(colRX + (barW * loreFrac) / 2, rY + barH / 2, barW * loreFrac, barH, P.CASH_GREEN));
    rY += 14;

    // Comeback tiers
    this.goalsModalGroup.add(this.add.text(colRX, rY, `Comeback tiers: ${this.state.comebackTier}/${COMEBACK_TIERS.length}`, textStyleLabel()));
    rY += 11;
    for (const t of COMEBACK_TIERS) {
      const got = this.state.comebackTier >= t.tier;
      this.goalsModalGroup.add(
        this.add.text(colRX + 4, rY, `${got ? "✓" : "○"} "${t.label}" (${t.threshold} lore)`, {
          ...textStyleLabel(), color: got ? "#4A7C4E" : "#999977",
        })
      );
      rY += 11;
    }
    rY += 4;

    // Supplier relationship
    const lvl = supplierLevelFor(this.state.supplierLbsPurchased);
    const disc = supplierDiscountFor(this.state.supplierLbsPurchased);
    this.goalsModalGroup.add(this.add.text(colRX, rY, `Supplier relationship: Level ${lvl}/3`, textStyleLabel()));
    rY += 11;
    this.goalsModalGroup.add(this.add.text(colRX + 4, rY,
      lvl > 0 ? `−${(disc * 100).toFixed(0)}% on raw orders` : "no discount yet",
      { ...textStyleLabel(), color: lvl > 0 ? "#4A7C4E" : "#999977" }));
    rY += 11;
    if (lvl < SUPPLIER_LEVEL_THRESHOLDS.length) {
      const need = SUPPLIER_LEVEL_THRESHOLDS[lvl] - this.state.supplierLbsPurchased;
      this.goalsModalGroup.add(this.add.text(colRX + 4, rY,
        `Order ${Math.ceil(need)} more lbs for Level ${lvl + 1}`,
        { ...textStyleLabel(), color: "#8B6F47" }));
      rY += 11;
    }

    // Footnote — goals are markers, not power-ups
    this.goalsModalGroup.add(this.add.text(colRX, mY + mH - 26,
      "Goals track your progress —\nthey grant no in-game boost.",
      { fontSize: "6px", color: "#8B6F47", fontFamily: "monospace" }));

    // Close button
    const doneBtn = this.add.rectangle(mX + mW / 2, mY + mH - 12, 80, 16, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.goalsModalGroup.add(doneBtn);
    this.goalsModalGroup.add(
      this.add.text(mX + mW / 2, mY + mH - 12, "CLOSE", { fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5)
    );
    doneBtn.on("pointerdown", () => this.closeGoalsModal());
    doneBtn.on("pointerover", () => doneBtn.setAlpha(0.85));
    doneBtn.on("pointerout",  () => doneBtn.setAlpha(1.0));
  }

  private closeGoalsModal(): void {
    if (this.goalsModalGroup) {
      this.goalsModalGroup.destroy(true);
      this.goalsModalGroup = undefined;
    }
    this.goalsModalOpen = false;
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // Settings panel (Polish & Pedagogy) — sound + accessibility + glossary entry.
  // Prefs persist to localStorage (own keys, not the save schema).
  // ---------------------------------------------------------------------------

  private openSettingsModal(): void {
    if (this.settingsModalOpen || this.glossaryModalOpen) return;
    this.settingsModalOpen = true;

    const W = this.scale.width, H = this.scale.height;
    const mW = 300, mH = 270;
    const mX = (W - mW) / 2, mY = (H - mH) / 2;

    this.settingsModalGroup = this.add.group();
    this.settingsModalGroup.add(
      this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.6).setInteractive()
    );
    this.settingsModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG).setStrokeStyle(2, P.PANEL_BORDER)
    );
    this.settingsModalGroup.add(this.add.text(mX + 8, mY + 6, "SETTINGS", textStyleHeader()));
    this.settingsModalGroup.add(this.add.rectangle(mX + mW / 2, mY + 20, mW - 8, 1, P.PANEL_BORDER));

    // A toggle row: label on the left, an ON/OFF pill on the right.
    const addToggle = (y: number, label: string, isOn: () => boolean, onToggle: () => void): void => {
      this.settingsModalGroup!.add(this.add.text(mX + 10, y, label, textStyleLabel()));
      const pill = this.add.rectangle(mX + mW - 40, y + 4, 56, 14, isOn() ? P.CASH_GREEN : 0x999977)
        .setStrokeStyle(1, P.PANEL_BORDER).setInteractive({ cursor: "pointer" });
      const lbl = this.add.text(mX + mW - 40, y + 4, isOn() ? "ON" : "OFF",
        { fontSize: "7px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5);
      this.settingsModalGroup!.add(pill);
      this.settingsModalGroup!.add(lbl);
      pill.on("pointerdown", () => {
        playButtonTick();
        onToggle();
        const on = isOn();
        lbl.setText(on ? "ON" : "OFF");
        pill.setFillStyle(on ? P.CASH_GREEN : 0x999977);
      });
    };

    let y = mY + 28;
    // Sound: the pill reads "ON" when sound is ENABLED (i.e. not muted).
    addToggle(y, "Sound", () => !isMuted(), () => { audioInit(this.storage); toggleMute(this.storage); });
    y += 22;
    // Music: independent of the SFX/Sound mute. When turned on mid-session we
    // ensure the AudioContext exists (gesture already satisfied) before playing.
    addToggle(y, "Music", isMusicOn, () => { audioInit(this.storage); toggleMusic(this.storage); });
    y += 22;
    addToggle(y, "Reduced motion", isReducedMotion, () => { toggleReducedMotion(this.storage); });
    y += 22;
    addToggle(y, "Colour-blind cues", isColorblindCues, () => { toggleColorblindCues(this.storage); this.updateHUD(); });
    y += 22;
    addToggle(y, "Large text", isLargeText, () => {
      toggleLargeText(this.storage);
      trySave(this.storage, this.state);
      this.closeSettingsModal();
      this.scene.restart();
    });
    y += 26;

    this.settingsModalGroup.add(this.add.rectangle(mX + mW / 2, y - 4, mW - 8, 1, P.PANEL_BORDER));

    // Glossary entry point.
    const glossBtn = this.add.rectangle(mX + mW / 2, y + 8, mW - 24, 16, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER).setInteractive({ cursor: "pointer" });
    this.settingsModalGroup.add(glossBtn);
    this.settingsModalGroup.add(this.add.text(mX + mW / 2, y + 8, "GLOSSARY — what do these words mean?",
      monoTextStyle(7)).setOrigin(0.5));
    glossBtn.on("pointerdown", () => { playButtonTick(); this.openGlossaryModal(); });
    glossBtn.on("pointerover", () => glossBtn.setAlpha(0.85));
    glossBtn.on("pointerout",  () => glossBtn.setAlpha(1.0));
    y += 22;

    this.settingsModalGroup.add(this.add.text(mX + 10, y,
      "Large text reloads the scene. Browser zoom (Ctrl + / −) still works too.",
      { ...textStyleLabel(), color: "#5A3A1A", wordWrap: { width: mW - 20 } }));
    y += 14;

    // A2 accuracy disclaimer (brief; full text lives atop the glossary).
    this.settingsModalGroup.add(this.add.text(mX + 10, y,
      "This game simplifies real business — see the Glossary for details.",
      { ...monoTextStyle(6, "#8B6F47"), wordWrap: { width: mW - 20 } }));
    y += 14;

    // Save Export / Import (relocated here from the upgrades modal).
    this.addSaveIORow(this.settingsModalGroup, mX, mW, y, () => this.closeSettingsModal());

    // Close
    const doneBtn = this.add.rectangle(mX + mW / 2, mY + mH - 12, 80, 16, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER).setInteractive({ cursor: "pointer" });
    this.settingsModalGroup.add(doneBtn);
    this.settingsModalGroup.add(this.add.text(mX + mW / 2, mY + mH - 12, "CLOSE",
      { fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5));
    doneBtn.on("pointerdown", () => this.closeSettingsModal());
    doneBtn.on("pointerover", () => doneBtn.setAlpha(0.85));
    doneBtn.on("pointerout",  () => doneBtn.setAlpha(1.0));
  }

  private closeSettingsModal(): void {
    if (this.settingsModalGroup) {
      this.settingsModalGroup.destroy(true);
      this.settingsModalGroup = undefined;
    }
    this.settingsModalOpen = false;
    this.updateHUD();
  }

  /**
   * Reusable Save Export / Import row (local file; CRIT-1 compliant — zero
   * server). Lives in Settings now (relocated out of the crowded upgrades
   * modal). `onClose` closes whichever modal hosts it after a successful import.
   */
  private addSaveIORow(group: Phaser.GameObjects.Group, mX: number, mW: number, rowY: number, onClose: () => void): void {
    group.add(this.add.rectangle(mX + mW / 2, rowY, mW - 8, 1, P.PANEL_BORDER));
    group.add(this.add.text(mX + 8, rowY + 4, "SAVE FILE (local, no server)",
      { fontSize: "7px", color: "#8B6F47", fontFamily: "monospace" }));
    const by = rowY + 18;

    const exportBtn = this.add.rectangle(mX + 72, by, 116, 14, 0x445566)
      .setStrokeStyle(1, P.PANEL_BORDER).setInteractive({ cursor: "pointer" });
    group.add(exportBtn);
    group.add(this.add.text(mX + 72, by, "EXPORT SAVE", { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5));
    exportBtn.on("pointerdown", () => {
      const json = serialize(this.state, this.playtimeSeconds);
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "driving-me-nuts-save.json"; a.click();
      URL.revokeObjectURL(url);
    });
    exportBtn.on("pointerover", () => exportBtn.setAlpha(0.85));
    exportBtn.on("pointerout",  () => exportBtn.setAlpha(1.0));

    const importBtn = this.add.rectangle(mX + mW - 72, by, 116, 14, 0x445566)
      .setStrokeStyle(1, P.PANEL_BORDER).setInteractive({ cursor: "pointer" });
    group.add(importBtn);
    group.add(this.add.text(mX + mW - 72, by, "IMPORT SAVE", { fontSize: "7px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5));
    importBtn.on("pointerdown", () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file"; fileInput.accept = ".json,application/json";
      fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string | undefined;
          if (!text) { this.showToast("Import failed: could not read file."); return; }
          const result = importEnvelopeText(text, this.storage);
          if (!result.ok || !result.state) {
            this.showToast(result.errorMessage ?? "Import failed: unknown error.");
          } else {
            this.state = result.state;
            // RT-2: imported save may have a different queue-slot count — reconcile first.
            this.syncSlotUI();
            onClose();
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
  }

  // ---------------------------------------------------------------------------
  // Glossary panel (Polish & Pedagogy) — opt-in plain-language definitions.
  // Left: term list. Right: selected definition. Top: A2 disclaimer.
  // Learning is never mandatory (C1 "broccoli" rule).
  // ---------------------------------------------------------------------------

  private openGlossaryModal(): void {
    if (this.glossaryModalOpen) return;
    this.glossaryModalOpen = true;

    const W = this.scale.width, H = this.scale.height;
    const mW = 460, mH = 250;
    const mX = (W - mW) / 2, mY = (H - mH) / 2;

    this.glossaryModalGroup = this.add.group();
    this.glossaryModalGroup.add(
      this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.65).setInteractive()
    );
    this.glossaryModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG).setStrokeStyle(2, P.PANEL_BORDER)
    );
    this.glossaryModalGroup.add(this.add.text(mX + 8, mY + 5, "GLOSSARY", textStyleHeader()));

    // Close [×]
    const closeBtn = this.add.rectangle(mX + mW - 12, mY + 11, 16, 14, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.glossaryModalGroup.add(closeBtn);
    this.glossaryModalGroup.add(this.add.text(mX + mW - 12, mY + 11, "×",
      { fontSize: "10px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5));
    closeBtn.on("pointerdown", () => this.closeGlossaryModal());

    // A2 disclaimer banner (always visible).
    this.glossaryModalGroup.add(this.add.text(mX + 8, mY + 20, GLOSSARY_DISCLAIMER,
      { fontSize: "6px", color: "#8B6F47", fontFamily: "monospace", wordWrap: { width: mW - 16 } }));

    const listX = mX + 8, listTop = mY + 44;
    const detailX = mX + 156, detailW = mW - 156 - 10;

    // Detail pane (updated on term tap). Start on the first entry.
    const detailTitle = this.add.text(detailX, listTop, "", textStyleHeader());
    const detailBody = this.add.text(detailX, listTop + 14, "",
      { ...textStyleLabel(), wordWrap: { width: detailW } });
    const detailInGame = this.add.text(detailX, listTop + 14, "",
      { fontSize: "7px", color: "#4A7C4E", fontFamily: "monospace", wordWrap: { width: detailW } });
    this.glossaryModalGroup.add(detailTitle);
    this.glossaryModalGroup.add(detailBody);
    this.glossaryModalGroup.add(detailInGame);

    const showEntry = (idx: number): void => {
      const e = GLOSSARY[idx];
      detailTitle.setText(e.term);
      detailBody.setText(e.definition);
      // Place the "in this game" note below the (variable-height) definition.
      detailInGame.setY(detailBody.y + detailBody.height + 6);
      detailInGame.setText(e.inGame ? `In this game: ${e.inGame}` : "");
    };

    // Term list (left column). Tap to show on the right.
    let ly = listTop;
    for (let i = 0; i < GLOSSARY.length; i++) {
      const e = GLOSSARY[i];
      const t = this.add.text(listX, ly, `• ${e.term}`,
        { fontSize: "7px", color: "#2C2416", fontFamily: "monospace", wordWrap: { width: 140 } });
      t.setInteractive({ cursor: "pointer" });
      t.on("pointerdown", () => { playButtonTick(); showEntry(i); });
      t.on("pointerover", () => t.setColor("#C0392B"));
      t.on("pointerout",  () => t.setColor("#2C2416"));
      this.glossaryModalGroup.add(t);
      ly += t.height + 1;
    }

    showEntry(0);

    // Back to settings
    const backBtn = this.add.rectangle(mX + mW / 2, mY + mH - 12, 110, 16, 0x556677)
      .setStrokeStyle(1, P.PANEL_BORDER).setInteractive({ cursor: "pointer" });
    this.glossaryModalGroup.add(backBtn);
    this.glossaryModalGroup.add(this.add.text(mX + mW / 2, mY + mH - 12, "CLOSE",
      { fontSize: "8px", color: "#F5DEB3", fontFamily: "monospace" }).setOrigin(0.5));
    backBtn.on("pointerdown", () => this.closeGlossaryModal());
    backBtn.on("pointerover", () => backBtn.setAlpha(0.85));
    backBtn.on("pointerout",  () => backBtn.setAlpha(1.0));
  }

  private closeGlossaryModal(): void {
    if (this.glossaryModalGroup) {
      this.glossaryModalGroup.destroy(true);
      this.glossaryModalGroup = undefined;
    }
    this.glossaryModalOpen = false;
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

    const slotLabel = this.add.text(sx + 3, sy + 3, `Slot ${i + 1}: [Empty] — tap to roast`, textStyleLabel());

    this.slotRects.push(slotRect);
    this.slotLabels.push(slotLabel);
    this.slotBars.push(bar);
    this.slotBarBgs.push(barBg);

    const slotIndex = i;
    slotRect.on("pointerdown", () => {
      if (!this.reportOpen && !this.supplyModalOpen && !this.roastModalOpen && !this.upgradesModalOpen && !this.districtModalOpen && !this.rescueModalOpen) {
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
    const mW = 280, mH = 184;
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
    const hdr = this.add.text(mX + 6, mY + 6, "BUY RAW PEANUTS", textStyleHeader());
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
      const t = this.add.text(mX + 6, ty, line, textStyleLabel());
      this.modalGroup.add(t);
      ty += 12;
    }

    // Wave 6: supplier-relationship status (loyalty discount, stacks with bulk)
    const supLvl = supplierLevelFor(this.state.supplierLbsPurchased);
    const supDisc = supplierDiscountFor(this.state.supplierLbsPurchased);
    const supLine = supLvl > 0
      ? `Supplier Lv${supLvl}: extra –${(supDisc * 100).toFixed(0)}% (loyalty, stacks)`
      : `Supplier Lv0: order more to earn loyalty discounts`;
    this.modalGroup.add(this.add.text(mX + 6, ty, supLine, { ...textStyleLabel(), color: supLvl > 0 ? "#4A7C4E" : "#8B6F47" }));
    ty += 12;

    // Qty controls
    const qLabel = this.add.text(mX + 6, ty + 4, "Qty:", textStyleBody());
    this.modalGroup.add(qLabel);

    const qtyText = this.add.text(mX + 36, ty + 4, `${this.supplyQty} lbs`, textStyleBody());
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
    const previewText = this.add.text(mX + 6, ty + 28, this.buildSupplyPreview(), textStyleBody());
    this.modalGroup.add(previewText);

    // Cash after preview
    const cashLine = this.add.text(mX + 6, ty + 42, "", textStyleBody());
    this.modalGroup.add(cashLine);

    // Rebuild preview with cash line
    const rebuildPreview = (): void => {
      previewText.setText(this.buildSupplyPreview());
      const cost = this.calcSupplyCost(this.supplyQty);
      const after = this.state.cash - cost;
      cashLine.setText(`Cash after: $${this.state.cash.toFixed(2)} – $${cost.toFixed(2)} = $${Math.max(0, after).toFixed(2)}`);
      cashLine.setStyle(after >= 0 ? textStyleGreen() : textStyleRed());
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
        // Wave 6: this order may have crossed a supplier-relationship threshold.
        const levelUp = ev.detail.supplierLevelUp as number | null;
        this.closeSupplyModal();
        if (levelUp) {
          const disc = supplierDiscountFor(this.state.supplierLbsPurchased);
          this.showToast(`Supplier relationship → Level ${levelUp}! Now –${(disc * 100).toFixed(0)}% on raw orders. Repeat business earns better terms.`);
        }
        // Save after a purchase so the supplier counter survives a crash mid-day.
        this.saveGame();
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
    // F7: use exported bulkDiscountFor — single source of truth.
    // Wave 6: also apply the supplier-relationship discount so the preview
    // matches what buyRaw actually charges (they stack multiplicatively).
    return qty * RAW_PEANUT_BASE_PRICE
      * (1 - bulkDiscountFor(qty))
      * (1 - supplierDiscountFor(this.state.supplierLbsPurchased));
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
    // RT5-2: also bail during the post-report chain — a click in a delayedCall
    // gap must not open a second day report on top of a pending aftermath beat.
    if (this.reportOpen || this.inPostReportChain || this.aftermathModalOpen) return;
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
      // Aftermath beats are queued durably by the engine in
      // state.pendingAftermath (RT5-1) — no scene-local collection needed here.
    }

    // Wave 6: achievement unlocks (earned milestones — celebratory, no pressure).
    // The first unlock of the day gets the celebration flourish; any extra
    // unlocks the same day fall back to toasts so banners don't strobe.
    let achDelay = 700;
    report.achievementEvents.forEach((ev, i) => {
      const name = ev.detail.name as string;
      const desc = ev.detail.desc as string;
      if (i === 0) {
        this.time.delayedCall(achDelay, () => this.showCelebration(`★ ${name}`, desc));
      } else {
        this.time.delayedCall(achDelay, () => this.showToast(`★ Achievement: ${name} — ${desc}`));
      }
      achDelay += 400;
    });

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
    // +14px for debt-service row (cash-flow vs P&L lesson); +34px for the weekly recap block
    const rH = 224 + (r.offlineEarned > 0 ? 14 : 0) + (r.activeDebtSummary ? 14 : 0) + (hasSparkline ? 20 : 0)
      + (r.debtService > 0 ? 14 : 0) + (r.weekRecap ? 34 : 0) + (r.autoSellLbs > 0 ? 14 : 0);
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
      this.add.text(rX + rW / 2, rY + 8, `END OF DAY — Day ${r.dayNumber} Summary`, textStyleHeader()).setOrigin(0.5, 0)
    );

    // Divider
    this.reportGroup.add(this.add.rectangle(rX + rW / 2, rY + 22, rW - 8, 1, P.PANEL_BORDER));

    // Location / ops line
    const locLabel = DISTRICT_CONFIGS[this.state.currentDistrict].label;
    this.reportGroup.add(this.add.text(rX + 8, rY + 27, `Location: ${locLabel}  |  Units sold: ${r.unitsSold.toFixed(1)} lbs`, textStyleLabel()));

    // Revenue & COGS box
    // F8: show avg realized price (revenue/unitsSold)
    // RT6-1: show the ACTUAL realized COGS/lb (revenue/units reflects discounts
    // carried through inventory) rather than the undiscounted standard cost, so
    // the supplier/bulk discount is visible as lower COGS at sale.
    const cogsLbDisplay = (r.unitsSold > 0
      ? r.cogs / r.unitsSold
      : RAW_PEANUT_BASE_PRICE + RECIPES.classic_salted.ingredientCostPerLb).toFixed(2);
    const rows: Array<[string, string, Phaser.Types.GameObjects.Text.TextStyle]> = [
      [`Revenue  (${r.unitsSold.toFixed(1)} lbs @ $${r.avgRealizedPrice.toFixed(2)} avg):`, `$${r.revenue.toFixed(2)}`, textStyleBody()],
      // Auto-sell off-peak clarifier (revenue already counted above; this just shows the split).
      ...(r.autoSellLbs > 0
        ? [[`  ↳ auto-sold leftover (10% off):`, `${r.autoSellLbs.toFixed(1)} lbs · $${r.autoSellRevenue.toFixed(2)}`, textStyleLabel()] as [string, string, Phaser.Types.GameObjects.Text.TextStyle]]
        : []),
      [`COGS     (@ $${cogsLbDisplay}/lb):`, `–$${r.cogs.toFixed(2)}`, textStyleRed()],
      [`Gross Profit:`, `$${r.grossProfit.toFixed(2)}  (${r.grossMarginPct.toFixed(0)}%)`, r.grossMarginPct >= 60 ? textStyleGreen() : textStyleRed()],
      // F1: separate cash-flow lesson line — production outflow vs. recognized COGS
      [`Cash spent on production today:`, `–$${r.cashSpentOnProduction.toFixed(2)}`, textStyleRed()],
      [`Fixed Costs  (permit + fuel):`, `–$${r.fixedCosts.toFixed(2)}`, textStyleRed()],
      // F13 fix: offline earnings shown as a distinct positive line (spec §6 / DARK_PATTERN_GATE Q8)
      ...(r.offlineEarned > 0
        ? [[`Offline rest earnings:`, `+$${r.offlineEarned.toFixed(2)}`, textStyleGreen()] as [string, string, Phaser.Types.GameObjects.Text.TextStyle]]
        : []),
      [`Net Profit:`, `$${r.net.toFixed(2)}`, r.net >= 0 ? textStyleGreen() : textStyleRed()],
      // Ledger v1: debt payments are cash out but NOT an expense — net profit
      // stays untouched. Profit ≠ cash is the bookkeeping lesson.
      ...(r.debtService > 0
        ? [[`Debt payments (cash, not expense):`, `–$${r.debtService.toFixed(2)}`, textStyleRed()] as [string, string, Phaser.Types.GameObjects.Text.TextStyle]]
        : []),
      // Wave 5: liability line — teaches liabilities vs cash (neutral, not shaming)
      ...(r.activeDebtSummary
        ? [[`Liabilities:`, r.activeDebtSummary, textStyleRed()] as [string, string, Phaser.Types.GameObjects.Text.TextStyle]]
        : []),
    ];

    let rowY = rY + 42;
    for (const [label, value, style] of rows) {
      this.reportGroup.add(this.add.text(rX + 8, rowY, label, textStyleLabel()));
      this.reportGroup.add(this.add.text(rX + rW - 8, rowY, value, style).setOrigin(1, 0));
      rowY += 14;
    }

    // Divider
    this.reportGroup.add(this.add.rectangle(rX + rW / 2, rowY + 2, rW - 8, 1, P.PANEL_BORDER));
    rowY += 8;

    // Cash flow line
    this.reportGroup.add(
      this.add.text(rX + 8, rowY, `Cash: $${r.cashBefore.toFixed(2)} → $${r.cashAfter.toFixed(2)}`, textStyleBody())
    );
    rowY += 16;

    // Insight line (THE key teaching surface — question, not shame)
    this.reportGroup.add(
      this.add.rectangle(rX + rW / 2, rowY + 14, rW - 10, 28, 0xEDD99A).setStrokeStyle(1, P.PANEL_BORDER)
    );
    this.reportGroup.add(
      this.add.text(rX + 8, rowY + 4, `Insight: ${r.insightLine}`, {
        ...textStyleLabel(),
        wordWrap: { width: rW - 16 },
      })
    );
    rowY += 36;

    // ---- Net history sparkline (item 3: last-7-days bar row) ----
    // Bookkeeping concept: factual framing only, no FOMO. Green = positive net, red = negative.
    if (hasSparkline) {
      this.reportGroup.add(
        this.add.text(rX + 8, rowY, "Last 7 days:", textStyleLabel())
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

    // ---- Weekly recap (every 7th day — factual totals, no streak framing) ----
    if (r.weekRecap) {
      const wr = r.weekRecap;
      this.reportGroup.add(this.add.rectangle(rX + rW / 2, rowY + 2, rW - 8, 1, P.PANEL_BORDER));
      rowY += 6;
      this.reportGroup.add(
        this.add.text(rX + 8, rowY, `WEEK ${wr.weekNumber} RECAP (${wr.daysIncluded} day${wr.daysIncluded === 1 ? "" : "s"})`, { ...textStyleLabel(), color: "#8B6F47" })
      );
      rowY += 12;
      const bestStr = wr.bestDay ? `best Day ${wr.bestDay.day} ($${wr.bestDay.net.toFixed(2)} net)` : "";
      this.reportGroup.add(
        this.add.text(rX + 8, rowY,
          `Revenue $${wr.totalRevenue.toFixed(2)} · Net $${wr.totalNet.toFixed(2)} · Margin ${wr.grossMarginPct.toFixed(0)}% · ${bestStr}`,
          { ...textStyleLabel(), wordWrap: { width: rW - 16 } })
      );
      rowY += 16;
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
    // RT5-2: hold the chain guard from the instant the report closes until the
    // whole post-report sequence (aftermath beats → rescue offer) is drained,
    // so the flag-less delayedCall gaps can't be clicked through.
    this.inPostReportChain = true;
    // Save after report is dismissed �� state is fully consistent post-endOfDay (spec §3)
    this.saveGame();
    this.updateHUD();

    // Aftermath beats first (closure of the OLD crisis), then any new rescue
    // offer. showAftermathBeat chains back here via afterReportFlow.
    this.afterReportFlow();
  }

  /**
   * Post-report sequence: drain state.pendingAftermath one beat at a time, then
   * open the rescue-offer modal if a new trigger fired this day. Holds
   * inPostReportChain across the delayedCall gaps; clears it only when nothing
   * is left to show (RT5-2).
   */
  private afterReportFlow(): void {
    const nextPath = this.state.pendingAftermath[0] as AftermathPath | undefined;
    if (nextPath) {
      this.time.delayedCall(300, () => this.showAftermathBeat(nextPath));
      return;
    }
    // Wave 5: open rescue-offer modal after report if trigger fired this day.
    // Keep the chain guard up through the 300ms gap, then release it right as
    // the modal opens (openRescueModal sets rescueModalOpen synchronously).
    if (this.state.rescueMode === "offer") {
      this.time.delayedCall(300, () => {
        this.inPostReportChain = false;
        this.openRescueModal();
      });
      return;
    }
    // Nothing left — release the chain guard, sim resumes.
    this.inPostReportChain = false;
  }

  // ---------------------------------------------------------------------------
  // Rescue aftermath beat (one-time per path — data/rescue_aftermath.ts)
  // A small dialogue card: speaker, two lines, the lesson, CONTINUE.
  // Closure only — never a new offer (re-entry escalation is owner-gated).
  // ---------------------------------------------------------------------------

  private showAftermathBeat(path: AftermathPath): void {
    if (this.aftermathModalOpen) return;
    const beat = AFTERMATH_BEATS[path];
    if (!beat) {
      // Unknown path defensively dropped from the durable queue so the chain
      // can't loop on it.
      if (this.state.pendingAftermath[0] === path) this.state.pendingAftermath.shift();
      this.afterReportFlow();
      return;
    }
    this.aftermathModalOpen = true;

    const W = this.scale.width;
    const H = this.scale.height;
    const mW = 340, mH = 150;
    const mX = (W - mW) / 2;
    const mY = (H - mH) / 2;

    this.aftermathModalGroup = this.add.group();

    const backdrop = this.add.rectangle(W / 2, H / 2, W, H, P.MODAL_SHADOW, 0.60)
      .setInteractive(); // block clicks through
    this.aftermathModalGroup.add(backdrop);

    this.aftermathModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH / 2, mW, mH, P.PANEL_BG)
        .setStrokeStyle(2, P.PANEL_BORDER)
    );

    this.aftermathModalGroup.add(
      this.add.text(mX + 8, mY + 6, `${beat.speaker} stops by the window`, textStyleHeader())
    );
    this.aftermathModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + 20, mW - 8, 1, P.PANEL_BORDER)
    );

    let lineY = mY + 26;
    for (const line of beat.lines) {
      const txt = this.add.text(mX + 8, lineY, line, {
        ...textStyleLabel(), color: "#5A3A1A", wordWrap: { width: mW - 16 },
      });
      this.aftermathModalGroup.add(txt);
      lineY += txt.height + 4;
    }

    // Lesson strip (same visual language as the report-card insight box)
    this.aftermathModalGroup.add(
      this.add.rectangle(mX + mW / 2, mY + mH - 36, mW - 10, 24, 0xEDD99A)
        .setStrokeStyle(1, P.PANEL_BORDER)
    );
    this.aftermathModalGroup.add(
      this.add.text(mX + 8, mY + mH - 46, `Takeaway: ${beat.lesson}`, {
        ...textStyleLabel(), wordWrap: { width: mW - 16 },
      })
    );

    const contBtn = this.add.rectangle(mX + mW / 2, mY + mH - 11, 100, 16, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.aftermathModalGroup.add(contBtn);
    this.aftermathModalGroup.add(
      this.add.text(mX + mW / 2, mY + mH - 11, "CONTINUE", { fontSize: "8px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5)
    );
    contBtn.on("pointerdown", () => this.closeAftermathBeat());
    contBtn.on("pointerover", () => contBtn.setAlpha(0.85));
    contBtn.on("pointerout",  () => contBtn.setAlpha(1.0));
  }

  private closeAftermathBeat(): void {
    if (this.aftermathModalGroup) {
      this.aftermathModalGroup.destroy(true);
      this.aftermathModalGroup = undefined;
    }
    this.aftermathModalOpen = false;
    // RT5-1: a beat is only marked "consumed" once it has actually been shown
    // and dismissed — pop it from the durable queue and persist, so closing the
    // tab mid-queue never silently drops the remaining beats.
    this.state.pendingAftermath.shift();
    this.saveGame();
    // Continue the post-report chain (more beats, or a rescue offer).
    this.afterReportFlow();
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

    // Code-generated coin sprite when loaded; otherwise the original gold dot.
    const circle: Phaser.GameObjects.Arc | Phaser.GameObjects.Image =
      addSprite(this, SPR.coin, x, y, 11) ?? this.add.circle(x, y, 5, P.COIN_GOLD);
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
      // Float upward (skipped under reduced motion — the +$ still fades in place).
      if (!isReducedMotion()) {
        pop.circle.y -= 20 * dt;
        pop.label.y  -= 20 * dt;
      }
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
  // Milestone celebration overlay — a brief, non-blocking flourish for EARNED
  // moments (achievement / comeback-tier unlocks). Never gates input, never
  // pauses the sim. Honors reduced motion: a static banner with no particle
  // burst and no scale-pop (DARK_PATTERN_GATE — celebratory, not pressuring;
  // no "act now", no timer the player must beat).
  // ---------------------------------------------------------------------------

  private showCelebration(title: string, subtitle = ""): void {
    // One at a time — a new milestone replaces any banner still showing.
    this.dismissCelebration();

    const W = this.scale.width;
    const cx = W / 2;
    const cy = 64;
    const bw = Math.max(170, title.length * 6 + 36);
    const bh = subtitle ? 36 : 24;

    const g = this.add.group();
    this.celebrationGroup = g;

    const panel = this.add.rectangle(cx, cy, bw, bh, P.PANEL_BG, 0.96).setStrokeStyle(2, P.AWNING);
    // Code-generated star sprites flanking the banner (earned-moment flair).
    const starL = addSprite(this, SPR.star, cx - bw / 2 + 10, cy, 16);
    const starR = addSprite(this, SPR.star, cx + bw / 2 - 10, cy, 16);
    if (starL) g.add(starL);
    if (starR) g.add(starR);
    const t1 = this.add.text(cx, subtitle ? cy - 7 : cy, title,
      { fontSize: scaledFont(11), color: "#2C2416", fontFamily: "monospace", fontStyle: "bold", align: "center", wordWrap: { width: bw - 12 } }
    ).setOrigin(0.5);
    g.add(panel);
    g.add(t1);
    if (subtitle) {
      g.add(this.add.text(cx, cy + 9, subtitle,
        { fontSize: "7px", color: "#5A3A1A", fontFamily: "monospace", align: "center", wordWrap: { width: bw - 12 } }
      ).setOrigin(0.5));
    }

    // A pleasant blip (respects the mute pref via the audio module).
    playCoinPop();

    if (!isReducedMotion()) {
      // Scale-pop the banner in.
      for (const obj of g.getChildren()) {
        const go = obj as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
        go.setScale(0.6);
        this.tweens.add({ targets: go, scale: 1, ease: "Back.easeOut", duration: 280 });
      }
      // Confetti burst — a handful of pixel chips flying out and fading.
      const colors = [P.COIN_GOLD, P.AWNING, P.CASH_GREEN];
      for (let i = 0; i < 12; i++) {
        const chip = this.add.rectangle(cx, cy, 4, 4, colors[i % colors.length]);
        g.add(chip);
        this.tweens.add({
          targets: chip,
          x: cx + Phaser.Math.Between(-90, 90),
          y: cy + Phaser.Math.Between(-30, 50),
          alpha: 0,
          angle: Phaser.Math.Between(-180, 180),
          ease: "Quad.easeOut",
          duration: Phaser.Math.Between(700, 1000),
        });
      }
    }

    // Auto-dismiss (no countdown shown — it just clears).
    this.celebrationTimer = this.time.delayedCall(isReducedMotion() ? 2000 : 2600, () => this.dismissCelebration());
  }

  private dismissCelebration(): void {
    if (this.celebrationTimer) {
      this.celebrationTimer.destroy();
      this.celebrationTimer = undefined;
    }
    if (this.celebrationGroup) {
      // RT: Phaser doesn't auto-kill tweens when a target is destroyed, so kill
      // the in-flight scale-pop/confetti tweens first (else they'd keep running
      // against destroyed objects until self-completing — harmless but untidy).
      for (const obj of this.celebrationGroup.getChildren()) {
        this.tweens.killTweensOf(obj);
      }
      this.celebrationGroup.destroy(true);
      this.celebrationGroup = undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // Smoke wis animation (P1_SPRITE_SPEC #2)
  // ---------------------------------------------------------------------------

  private animateSmoke(dt: number): void {
    // Reduced motion: show a steady, non-pulsing wisp over active roasters
    // (still communicates "roasting" without movement).
    if (isReducedMotion()) {
      const active = this.state.roastSlots.filter(s => s.status === "roasting").length;
      for (let i = 0; i < this.smokeCircles.length; i++) {
        const c = this.smokeCircles[i];
        c.setAlpha(i < active ? 0.35 : 0);
        c.y = 195 - 50 - i * 8;
      }
      return;
    }
    this.smokeTimer += dt;
    const activeRoasts = this.state.roastSlots.filter(s => s.status === "roasting").length;

    for (let i = 0; i < this.smokeCircles.length; i++) {
      const c = this.smokeCircles[i];
      if (i < activeRoasts) {
        // Pulse opacity and slight drift
        const phase = (this.smokeTimer * 0.8 + i * 1.1) % (Math.PI * 2);
        c.setAlpha(0.3 + 0.3 * Math.sin(phase));
        const baseY = this.truckContainer?.y ?? this.truckBaseY;
        c.y = (baseY - 50 - i * 8) + Math.sin(this.smokeTimer * 0.5 + i) * 3;
        c.x = this.smokeOriginX - 10 + i * 6;
      } else {
        c.setAlpha(0);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // NPC ambient walk animation
  // ---------------------------------------------------------------------------

  private animateNpcs(dt: number): void {
    if (isReducedMotion()) return;
    const W = this.scale.width;
    for (const npc of this.npcs) {
      npc.x += npc.dir * npc.speed * dt;
      if (npc.x > W - 60 || npc.x < 150) npc.dir *= -1;
      npc.container.setPosition(npc.x, npc.y);
    }
    if (this.truckContainer) {
      this.truckBouncePhase += dt;
      this.truckContainer.y = this.truckBaseY + Math.sin(this.truckBouncePhase * 2.5) * 2;
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

  private showGagBubble(loreId: string, comebackId?: string): void {
    const line = LORE_BY_ID[loreId];
    if (!line) return;

    // Comeback Lines (GDD B4): once a tier is unlocked, the engine attaches a
    // comebackId — the owner's earned reply replaces the stock one.
    const ownerReply = (comebackId && COMEBACK_BY_ID[comebackId])
      ? COMEBACK_BY_ID[comebackId].text
      : line.owner;

    // Dismiss any existing bubble before showing the new one.
    this.dismissGagBubble();

    const W = this.scale.width;
    const truckX = W / 2 + 60;
    const truckY = 195;

    // Bubble anchor: just above the truck serving window (left side).
    // Comeback replies run longer than stock ones — grow the bubble to fit.
    // RT5-4: 7px monospace in a 172px wrap width fits ~40 chars/line, not 50;
    // under-budgeting overflowed the longest tier-2/3/4 lines past the border.
    const extraLines = Math.max(0, Math.ceil(ownerReply.length / 40) - 1);
    const bX = truckX - 80;
    const bW = 180;
    const bH = 36 + extraLines * 9;
    const bY = truckY - 80 - extraLines * 9;

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
      if (ownerLine.active) ownerLine.setText(ownerReply);
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

    // Re-entry escalation (RESCUE_ARC_SCRIPT §Re-Entry): a repeat crisis (the
    // player has taken a path before) gets harsher loan/preorder terms + varied
    // dialogue. The one-concurrent-crisis gate guarantees we only reach here
    // after the prior crisis fully resolved, so this is never a debt-stacking pump.
    const isRepeat = this.state.rescueEntryCount >= 1;
    const loanRate = isRepeat ? RESCUE_LOAN_FEE_RATE_REPEAT : RESCUE_LOAN_FEE_RATE;
    const loanOwe = (RESCUE_LOAN_PRINCIPAL * (1 + loanRate)).toFixed(2);
    const loanPct = (loanRate * 100).toFixed(0);
    // RT-1b/F3 (A2 accuracy): annualize the flat fee on the ACTUAL 14-day term —
    // the same simple-APR basis QuickNut's 391% uses — so the friendly loan isn't
    // shown ~6x cheaper than it is. ~130% (5%) / ~182% (7%); still << QuickNut.
    const loanApr = Math.round(loanRate * (365 / RESCUE_LOAN_DUE_DAYS) * 100);
    const preLbs  = isRepeat ? RESCUE_PREORDER_LBS_REPEAT : RESCUE_PREORDER_LBS;
    const preCash = isRepeat ? RESCUE_PREORDER_CASH_REPEAT : RESCUE_PREORDER_CASH;
    const preCogs = Math.round(preLbs * 0.50);   // ~$0.50/lb roasted-cost rule of thumb
    const preProfit = preCash - preCogs;

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
      this.add.text(mX + 52, mY + 6, "TILL RUNS THIN — Old Joe's at the Window", textStyleHeader())
    );

    // ---- Old Joe dialogue (varies on re-entry — never shaming) ----
    const joeDialogue = isRepeat
      ? "\"I see you're in it again. That's part of the game — no shame in it.\nLet's talk about what changed. Terms are a touch steeper this time:\nrepeat borrowing costs more. That's the lesson, not a punishment.\""
      : "\"Long day? Cash-flow problems aren't shameful — that's how you learn.\nBefore tomorrow gets worse, let's talk about what gets you through the week.\"";
    this.rescueModalGroup.add(
      this.add.text(mX + 52, mY + 20, joeDialogue,
        { ...textStyleLabel(), color: "#5A3A1A", wordWrap: { width: mW - 60 } }
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
        label: isRepeat ? "OLD JOE'S LOAN ↑" : "OLD JOE'S LOAN",
        color: P.CASH_GREEN,
        lines: [
          "+$75 cash now",
          `Owe: $${loanOwe}`,
          "Due: 14 days",
          `${loanPct}% flat fee`,
          `(≈${loanApr}%/yr APR)`,
          "",
          ...(isRepeat
            ? ["Steeper this time", "— repeat debt", "costs more."]
            : ["Fair handshake.", "Pay any time.", "No hidden fees."]),
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
          ...(isRepeat
            ? ["\"I vouched for", "you. Don't make", "me regret it.\""]
            : ["Marta vouched", "for you. Sell,", "then pay."]),
        ],
      },
      {
        id: "preorder",
        label: isRepeat ? "DEREK'S ORDER ↑" : "DEREK'S ORDER",
        color: 0x5A7A8A,
        lines: [
          `+$${preCash} cash now`,
          `Deliver ${preLbs}lbs`,
          "roasted in 7d",
          "",
          `Rev: $${preCash}`,
          `COGS: ~$${preCogs}`,
          `Profit: ~$${preProfit}`,
          "",
          ...(isRepeat
            ? ["Bigger order —", "prove you scale."]
            : ["Execute or", "trust is dented."]),
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
        // Capture the event so the confirm toast reflects ACTUAL terms (base or
        // escalated re-entry terms), not hardcoded first-time numbers.
        const ev = chooseRescuePath(this.state, pathId);
        const d = ev.detail;
        this.closeRescueModal();
        this.updateHUD();
        // Toast confirming the choice (factual, not congratulatory)
        const toastMsg = pathId === "loan"
          ? `Old Joe's loan: +$${RESCUE_LOAN_PRINCIPAL}. Owe $${(d.amountDue as number).toFixed(2)} in 14 days.`
          : pathId === "credit"
          ? "Marta's credit: +125 lbs raw. Owe $50 in 14 days."
          : pathId === "preorder"
          ? `Derek's order accepted: +$${d.cashChange as number}. Deliver ${d.totalLbs as number} lbs roasted in 7 days.`
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

    group.add(this.add.text(mX + mW / 2, mY + 10, "Reset save?", textStyleHeader()).setOrigin(0.5, 0));
    group.add(this.add.text(mX + mW / 2, mY + 28, "This wipes all progress and starts fresh.", {
      ...textStyleLabel(), wordWrap: { width: mW - 16 },
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
        fontSize: "7px", color: "#8B6F47", fontFamily: "monospace",
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

  // ---------------------------------------------------------------------------
  // Dev QA bridge (docs/QA_CLICK_MAP.md) — same handlers as UI pointerdown
  // ---------------------------------------------------------------------------

  qaFlags(): {
    supplyModalOpen: boolean;
    roastModalOpen: boolean;
    reportOpen: boolean;
    dayNumber: number;
    inPostReportChain: boolean;
    aftermathModalOpen: boolean;
  } {
    return {
      supplyModalOpen: this.supplyModalOpen,
      roastModalOpen: this.roastModalOpen,
      reportOpen: this.reportOpen,
      dayNumber: this.state.dayNumber,
      inPostReportChain: this.inPostReportChain,
      aftermathModalOpen: this.aftermathModalOpen,
    };
  }

  qaClickBuyRaw(): void {
    if (!this.reportOpen && !this.rescueModalOpen && !this.districtModalOpen) {
      playButtonTick();
      this.advanceTutorialOnAction(0);
      this.openSupplyModal();
    }
  }

  qaCloseSupplyModal(): void {
    if (this.supplyModalOpen) this.closeSupplyModal();
  }

  qaClickRoastSlot(slotIndex: number): void {
    if (
      !this.reportOpen &&
      !this.supplyModalOpen &&
      !this.roastModalOpen &&
      !this.upgradesModalOpen &&
      !this.districtModalOpen &&
      !this.rescueModalOpen
    ) {
      this.advanceTutorialOnAction(1);
      this.handleSlotClick(slotIndex);
    }
  }

  qaCloseRoastModal(): void {
    if (this.roastModalOpen) this.closeRoastModal();
  }

  qaClickEndDay(): void {
    if (
      !this.reportOpen &&
      !this.supplyModalOpen &&
      !this.roastModalOpen &&
      !this.upgradesModalOpen &&
      !this.districtModalOpen &&
      !this.rescueModalOpen
    ) {
      this.triggerEndOfDay();
    }
  }

  qaCloseDayReport(): void {
    if (this.reportOpen) this.closeDayReport();
  }
}
