import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    // Placeholder truck rect (warm amber — peanut-truck palette placeholder)
    const truckRect = this.add.rectangle(
      width / 2,
      height / 2 + 20,
      120,
      60,
      0xd4820a
    );
    truckRect.setStrokeStyle(2, 0xffc94a);

    // Cabin
    this.add.rectangle(width / 2 + 28, height / 2 + 8, 50, 40, 0xb06800);

    // Wheels
    this.add.circle(width / 2 - 30, height / 2 + 52, 10, 0x333333);
    this.add.circle(width / 2 + 30, height / 2 + 52, 10, 0x333333);

    // Title
    this.add
      .text(width / 2, height / 2 - 40, "DRIVING ME NUTS", {
        fontSize: "16px",
        color: "#ffc94a",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, height / 2 - 22, "roasted peanuts — fresh daily", {
        fontSize: "7px",
        color: "#c8a060",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Boot hint
    this.add
      .text(width / 2, height - 14, "[ P1 scaffold ]", {
        fontSize: "6px",
        color: "#555533",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
