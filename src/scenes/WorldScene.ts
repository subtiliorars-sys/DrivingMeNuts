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
  private npcResidential?: Phaser.GameObjects.Arc;
  private dialogueText?: Phaser.GameObjects.Text;
  private questStatus: "idle" | "offered" | "accepted" | "completed" = "idle";

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

    // Add NPC in Residential district
    this.npcResidential = this.add.circle(620, 430, 15, 0xff0000).setStrokeStyle(2, 0x000000);
    this.add.text(620, 400, "Resident", { fontSize: "12px", color: "#000" }).setOrigin(0.5);

    this.truck = drawFoodTruck(this, 200, 450);
    
    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Talk trigger
        this.input.keyboard.on("keydown-T", () => {
          this.checkNPCTalk();
        });
    }

    this.add.text(16, 16, "Phase 2 RPG Shell: World Map\nUse Arrow Keys to move truck.\nTap Market/Residential to switch.\nPress 'T' near NPC to talk.", {
      fontSize: "18px",
      color: "#000",
      backgroundColor: "#fff",
      padding: { x: 10, y: 10 }
    });

    // Interaction
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Check for NPC talk first
      const distToNPC = Phaser.Math.Distance.Between(pointer.x, pointer.y, 620, 430);
      if (distToNPC < 40) {
        this.checkNPCTalk();
        return;
      }

      for (const loc of this.locations) {
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, loc.x, loc.y);
        if (dist < 40) {
          this.moveTruckTo(loc.x);
        }
      }
    });
  }

  private checkNPCTalk(): void {
    if (!this.npcResidential) return;
    const dist = Phaser.Math.Distance.Between(this.truck.container.x, this.truck.container.y, this.npcResidential.x, this.npcResidential.y);
    if (dist < 60) {
      if (this.questStatus === "idle") {
        this.showDialogue("Resident: \"Hey! You're the legume guy? My cousin at the Market said you have the best salted peanuts.\"\nQuest Offered: Deliver a fresh bag to the Market. Press 'T' again to accept.");
        this.questStatus = "offered";
      } else if (this.questStatus === "offered") {
        this.showDialogue("Resident: \"Great! Here's the bag. Get it to the Market quickly!\"\nQuest Accepted: Drive to the Market District.");
        this.questStatus = "accepted";
      } else if (this.questStatus === "accepted") {
        this.showDialogue("Resident: \"Why are you still here? The Market is that way!\"");
      } else if (this.questStatus === "completed") {
        this.showDialogue("Resident: \"Thanks again! That legume delivery really hit the spot.\"");
      }
    }
  }

  private showDialogue(text: string): void {
    if (this.dialogueText) this.dialogueText.destroy();
    
    this.dialogueText = this.add.text(WORLD.width / 2, WORLD.height - 100, text, {
      fontSize: "18px",
      color: "#fff",
      backgroundColor: "#000",
      padding: { x: 15, y: 10 },
      wordWrap: { width: WORLD.width - 100 }
    }).setOrigin(0.5);

    this.time.delayedCall(4000, () => {
      if (this.dialogueText) this.dialogueText.destroy();
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

  private velocityX = 0;
  private maxSpeed = 5;
  private acceleration = 0.5;
  private friction = 0.9;

  update(): void {
    const prevX = this.truck.container.x;
    
    if (this.cursors?.left.isDown) {
      this.velocityX -= this.acceleration;
    } else if (this.cursors?.right.isDown) {
      this.velocityX += this.acceleration;
    } else {
      this.velocityX *= this.friction;
    }

    // Clamp speed
    this.velocityX = Phaser.Math.Clamp(this.velocityX, -this.maxSpeed, this.maxSpeed);
    
    // Apply movement
    this.truck.container.x += this.velocityX;

    // Basic Player Collisions (World Bounds)
    this.truck.container.x = Phaser.Math.Clamp(this.truck.container.x, 20, WORLD.width - 20);

    // Stop velocity if hitting bounds
    if (this.truck.container.x <= 20 || this.truck.container.x >= WORLD.width - 20) {
      this.velocityX = 0;
    }

    // Transition Trigger between Market (200) and Residential (600)
    const midPoint = 400;
    if ((prevX < midPoint && this.truck.container.x >= midPoint) || 
        (prevX > midPoint && this.truck.container.x <= midPoint)) {
      this.onDistrictTransition(this.truck.container.x > midPoint ? "residential" : "market");
    }
  }

  private onDistrictTransition(newDistrictId: string): void {
    console.log(`DM-P2-W2: Transitioned to ${newDistrictId}`);
    
    if (newDistrictId === "market" && this.questStatus === "accepted") {
      this.questStatus = "completed";
      this.showDialogue("Quest Completed: Peanuts delivered to the Market! +50 Legume Credits.");
    }

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
