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
} from "../sim/engine.js";
import type { SimState, DayReport } from "../sim/types.js";
import {
  DAY_DURATION_SECONDS,
  DEFAULT_SELL_PRICE,
  PRICE_MIN,
  PRICE_MAX,
  BATCH_MIN_LBS,
  BATCH_MAX_LBS,
  RAW_PEANUT_BASE_PRICE,
  BULK_DISCOUNT_TIERS,
  RECIPES,
} from "../data/economy.js";

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

  // ---- Modal state --------------------------------------------------------
  private modalGroup?: Phaser.GameObjects.Group;
  private reportGroup?: Phaser.GameObjects.Group;
  private supplyModalOpen = false;
  private reportOpen = false;

  // ---- Supply modal working qty -------------------------------------------
  private supplyQty = 50; // default qty for supply modal

  // ---- Price step size ----------------------------------------------------
  private readonly PRICE_STEP = 0.05;

  constructor() {
    super({ key: "GameScene" });
  }

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  create(): void {
    const W = this.scale.width;   // 480
    const H = this.scale.height;  // 270

    this.state = createState(1);

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

    this.add.text(W / 2, 2, "FARMERS' MARKET", {
      ...TEXT_STYLE_LABEL, color: "#FF9800",
    }).setOrigin(0.5, 0);

    this.txtCash = this.add.text(W - 6, 2, "Cash: $50.00", {
      ...TEXT_STYLE_BODY, color: "#FFD700",
    }).setOrigin(1, 0);

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
        if (!this.reportOpen && !this.supplyModalOpen) {
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
    btnMinus.on("pointerdown", () => { if (!this.reportOpen) this.adjustPrice(-this.PRICE_STEP); });
    btnMinus.on("pointerover", () => btnMinus.setAlpha(0.8));
    btnMinus.on("pointerout",  () => btnMinus.setAlpha(1.0));

    // Plus button
    const btnPlus = this.add.rectangle(pX + 46, pY + 35, 22, 16, P.AWNING)
      .setStrokeStyle(1, P.PANEL_BORDER)
      .setInteractive({ cursor: "pointer" });
    this.add.text(pX + 46, pY + 35, "+", { fontSize: "10px", color: "#2C2416", fontFamily: "monospace" }).setOrigin(0.5);
    btnPlus.on("pointerdown", () => { if (!this.reportOpen) this.adjustPrice(+this.PRICE_STEP); });
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
    this.add.text(buyBtnX + 68, buyBtnY + 10, "BUY RAW PEANUTS", {
      fontSize: "8px", color: "#2C2416", fontFamily: "monospace",
    }).setOrigin(0.5);
    buyBtn.on("pointerdown", () => { if (!this.reportOpen) this.openSupplyModal(); });
    buyBtn.on("pointerover", () => buyBtn.setAlpha(0.85));
    buyBtn.on("pointerout",  () => buyBtn.setAlpha(1.0));

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
    endBtn.on("pointerdown", () => { if (!this.reportOpen && !this.supplyModalOpen) this.triggerEndOfDay(); });

    // Initial HUD render
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // update — Phaser game loop
  // ---------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    if (this.reportOpen || this.supplyModalOpen) return;

    // Convert Phaser ms delta to game-time seconds.
    // Time scale: 1 real second = 1 simulated second (P1; tunable later via scale factor).
    const dtSeconds = delta / 1_000;

    const prevDayElapsed = this.state.dayElapsedSeconds;
    const events = tick(this.state, dtSeconds);

    // Handle events for coin pops and day-end trigger
    for (const ev of events) {
      if (ev.kind === "sale") {
        this.spawnCoinPop(ev.detail.revenue as number);
      }
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
    this.txtCash.setText(`Cash: $${this.state.cash.toFixed(2)}`);
    this.txtDay.setText(`Day ${this.state.dayNumber}`);
    this.txtRawStock.setText(`Raw: ${this.state.rawStockLbs.toFixed(1)} lbs`);
    this.txtRoastedStock.setText(`Roasted: ${this.state.roastedStockLbs.toFixed(1)} lbs`);
    this.txtPrice.setText(`$${this.state.sellPrice.toFixed(2)}`);

    // Demand hint at current price
    const demandLbsHr = projectedDemand(this.state.sellPrice);
    const cogsPerLb = 0.60; // classic_salted P1 only
    const marginPct = this.state.sellPrice > 0
      ? ((this.state.sellPrice - cogsPerLb) / this.state.sellPrice) * 100
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
        const minLeft = Math.ceil(slot.secondsRemaining / 60);
        const progress = 1 - slot.secondsRemaining / Math.max(1, slot.totalSeconds);
        label.setText(`Slot ${i + 1}: ${slot.batchLbs}lb roasting… ${minLeft}m left`).setStyle(TEXT_STYLE_LABEL);
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
      // P1: always classic_salted, default 10 lbs
      // Check if we have enough raw stock and cash
      if (this.state.rawStockLbs < BATCH_MIN_LBS) {
        this.showToast("No raw stock — buy peanuts first!");
        return;
      }
      const batchLbs = Math.min(10, this.state.rawStockLbs, BATCH_MAX_LBS);
      const ev = startRoast(this.state, slotIndex, "classic_salted", batchLbs);
      if (!ev) {
        this.showToast("Not enough cash for ingredients!");
      }
    } else if (slot.status === "ready") {
      // Dismiss the "ready" visual — stock already added to roastedStockLbs on ready event
      // No state change needed; batch sits until end of day naturally
      this.showToast(`${slot.batchLbs} lbs ready — selling automatically!`);
    }
    this.updateHUD();
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

    // Bulk discount table (static)
    const tableLines = [
      "  1–99 lbs:  $0.40/lb  (no discount)",
      " 100–499:   $0.38/lb  (–5%)",
      " 500+:       $0.35/lb  (–12%)",
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

    // Hook qty buttons to also rebuild cash line
    // (reuse the makeQtyBtn pattern — re-wire pointerdown to include cashLine update)
    // We'll update previewText + cashLine via a refresh each frame while modal is open
    this.time.addEvent({ delay: 100, repeat: -1, callback: rebuildPreview });

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
    let discount = 0;
    for (const tier of BULK_DISCOUNT_TIERS) {
      if (qty >= tier.minLbs) { discount = tier.discount; break; }
    }
    return qty * RAW_PEANUT_BASE_PRICE * (1 - discount);
  }

  private closeSupplyModal(): void {
    if (this.modalGroup) {
      this.modalGroup.destroy(true);
      this.modalGroup = undefined;
    }
    this.supplyModalOpen = false;
    this.time.removeAllEvents();
    this.updateHUD();
  }

  // ---------------------------------------------------------------------------
  // End of day report (UI_WIREFRAMES §4)
  // ---------------------------------------------------------------------------

  private triggerEndOfDay(): void {
    if (this.reportOpen) return;
    this.reportOpen = true;

    // Pause the sim — reportOpen flag stops tick() calls
    const report = endOfDay(this.state);
    this.showDayReport(report);
  }

  private showDayReport(r: DayReport): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const rW = 300, rH = 210;
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
    const rows: Array<[string, string, Phaser.Types.GameObjects.Text.TextStyle]> = [
      [`Revenue  (${r.unitsSold.toFixed(1)} lbs @ $${this.state.sellPrice.toFixed(2)}):`, `$${r.revenue.toFixed(2)}`, TEXT_STYLE_BODY],
      [`COGS     (@ $${RECIPES.classic_salted.ingredientCostPerLb + RAW_PEANUT_BASE_PRICE}/lb):`, `–$${r.cogs.toFixed(2)}`, TEXT_STYLE_RED],
      [`Gross Profit:`, `$${r.grossProfit.toFixed(2)}  (${r.grossMarginPct.toFixed(0)}%)`, r.grossMarginPct >= 60 ? TEXT_STYLE_GREEN : TEXT_STYLE_RED],
      [`Fixed Costs  (permit + fuel):`, `–$${r.fixedCosts.toFixed(2)}`, TEXT_STYLE_RED],
      [`Net Profit:`, `$${r.net.toFixed(2)}`, r.net >= 0 ? TEXT_STYLE_GREEN : TEXT_STYLE_RED],
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
    this.updateHUD();
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
}
