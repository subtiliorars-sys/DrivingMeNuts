import Phaser from "phaser";
import { WORLD } from "../sim/types.js";
import { drawFoodTruck, FoodTruckHandle } from "./truck.js";

export class WorldScene extends Phaser.Scene {
  private truck!: FoodTruckHandle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private locations: Array<{ id: string; name: string; x: number; y: number }> = [
    { id: "market", name: "Market", x: 200, y: 450 },
    { id: "residential", name: "Residential", x: 600, y: 450 },
  ];

  constructor() {
    super("WorldScene");
  }

  create(): void {
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x87ceeb); // Sky
    this.add.rectangle(WORLD.width / 2, WORLD.height * 0.75, WORLD.width, WORLD.height * 0.5, 0x7cb87c); // Grass
    this.add.rectangle(WORLD.width / 2, 450, WORLD.width, 40, 0x555555); // Road

    // Draw locations
    for (const loc of this.locations) {
      this.add.circle(loc.x, loc.y, 10, 0xffffff).setStrokeStyle(2, 0x000000);
      this.add.text(loc.x, loc.y + 20, loc.name, { fontSize: "14px", color: "#000" }).setOrigin(0.5, 0);
    }

    this.truck = drawFoodTruck(this, 200, 450);
    
    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    this.add.text(16, 16, "Phase 2 RPG Shell: World Map\nUse Arrow Keys to move truck.\nTap Market/Residential to switch.", {
      fontSize: "18px",
      color: "#000",
      backgroundColor: "#fff",
      padding: { x: 10, y: 10 }
    });

    // Interaction
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      for (const loc of this.locations) {
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, loc.x, loc.y);
        if (dist < 40) {
          this.moveTruckTo(loc.x);
        }
      }
    });
  }

  private moveTruckTo(targetX: number): void {
    this.tweens.add({
      targets: this.truck.container,
      x: targetX,
      duration: 1000,
      ease: "Power2"
    });
  }

  update(): void {
    const prevX = this.truck.container.x;
    if (this.cursors?.left.isDown) {
      this.truck.container.x -= 2;
    } else if (this.cursors?.right.isDown) {
      this.truck.container.x += 2;
    }

    // Basic Player Collisions (World Bounds)
    this.truck.container.x = Phaser.Math.Clamp(this.truck.container.x, 20, WORLD.width - 20);

    // Transition Trigger between Market (200) and Residential (600)
    const midPoint = 400;
    if ((prevX < midPoint && this.truck.container.x >= midPoint) || 
        (prevX > midPoint && this.truck.container.x <= midPoint)) {
      this.onDistrictTransition(this.truck.container.x > midPoint ? "residential" : "market");
    }
  }

  private onDistrictTransition(newDistrictId: string): void {
    console.log(`DM-P2-W2: Transitioned to ${newDistrictId}`);
    const loc = this.locations.find(l => l.id === newDistrictId);
    if (loc) {
      const msg = this.add.text(WORLD.width / 2, 100, `Entering ${loc.name}...`, {
        fontSize: "24px",
        color: "#fff",
        backgroundColor: "#000",
        padding: { x: 10, y: 5 }
      }).setOrigin(0.5);
      
      this.time.delayedCall(2000, () => msg.destroy());
    }
  }
}
