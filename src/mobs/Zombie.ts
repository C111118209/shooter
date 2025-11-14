import { BaseMob } from "./BaseMob";

/**
 * 🧟 ZombieMob：基本近戰怪物
 * ------------------------------------------
 * 模擬低速持續追擊玩家的殭屍。
 */
export class ZombieMob extends BaseMob {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "zombie");
    this.speed = 60;
  }

  /** 緩慢但持續地移動 */
  public override updateBehavior() {
    super.updateBehavior();
  }
}
