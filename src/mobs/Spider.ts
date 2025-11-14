import { BaseMob } from "./BaseMob";

/**
 * 🕷 SpiderMob：快速移動型怪物
 * ------------------------------------------
 * 以「速度提升」作為特性。
 */
export class SpiderMob extends BaseMob {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "spider");
    this.speed = 120;
  }

  public override updateBehavior() {
    super.updateBehavior();
  }
}
