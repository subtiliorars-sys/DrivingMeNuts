#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPRITES_DIR = path.join(__dirname, '..', 'assets', 'sprites');

const ASSETS = [
  // High Priority (P1-Blocking)
  { name: 'truck-idle.png', priority: 'P1', desc: 'Truck – Idle Bounce (96x64 px)' },
  { name: 'smoke-wisps.png', priority: 'P1', desc: 'Roasting Hood Smoke Wisps (48x48 px)' },
  { name: 'raw-peanut-sack.png', priority: 'P1', desc: 'Raw Peanut Sack (24x28 px)' },
  { name: 'roasted-peanut-bag.png', priority: 'P1', desc: 'Roasted Peanut Bag (24x32 px)' },
  { name: 'coin-pop.png', priority: 'P1', desc: 'Coin/Cash Pop (16x16 px)' },
  { name: 'npc-legume-lecturer.png', priority: 'P1', desc: 'Customer NPC – Legume Lecturer (28x40 px)' },
  { name: 'npc-concerned-parent.png', priority: 'P1', desc: 'Customer NPC – Concerned Parent (32x36 px)' },
  { name: 'npc-office-worker.png', priority: 'P1', desc: 'Customer NPC – Office Worker (26x38 px)' },
  { name: 'owner-portrait.png', priority: 'P1', desc: 'Owner/Player Portrait (32x40 px)' },
  { name: 'district-backdrop.png', priority: 'P1', desc: 'District Backdrop (480x270 px)' },
  { name: 'ui-panel.png', priority: 'P1', desc: 'UI 9-Slice Panel (72x72 px sheet, 8x8 px grid)' },
  { name: 'icon-cash.png', priority: 'P1', desc: 'Icon – Cash/Currency (16x16 px)' },
  { name: 'icon-queue.png', priority: 'P1', desc: 'Icon – Queue Slot (20x20 px)' },
  
  // Nice-to-Have
  { name: 'icon-timer.png', priority: 'P2', desc: 'Icon – Timer (16x16 px)' },
  { name: 'icon-warning.png', priority: 'P2', desc: 'Icon – Warning (16x16 px)' },
  { name: 'roaster-machine.png', priority: 'P2', desc: 'Roaster Machine (48x48 px)' },
];

let missingP1 = 0;
let missingP2 = 0;

console.log('Validating assets based on docs/ARTIST_BRIEF.md...\n');

ASSETS.forEach(asset => {
  const filePath = path.join(SPRITES_DIR, asset.name);
  if (fs.existsSync(filePath)) {
    console.log(`[OK] ${asset.name} (${asset.desc})`);
  } else {
    console.log(`[MISSING] ${asset.name} (${asset.desc}) - Priority: ${asset.priority}`);
    if (asset.priority === 'P1') missingP1++;
    if (asset.priority === 'P2') missingP2++;
  }
});

console.log('\n--- Validation Summary ---');
console.log(`Missing P1 (Blocking) Assets: ${missingP1}`);
console.log(`Missing P2 (Nice-to-Have) Assets: ${missingP2}`);

// Exit successfully regardless, to not break build while assets are being worked on.
// Alternatively, we could fail if missingP1 > 0 if this was a strict check.
process.exit(0);
