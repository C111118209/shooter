// skeleton.ts
import Phaser from "phaser";
import { BaseMob } from "./BaseMob";
import { BowStrategy } from "../weapons/BowStrategy";

/**
 * 🦴 SkeletonMob：遠程怪物
 */
export class SkeletonMob extends BaseMob {
  private attackRange: number = 300;
  private keepDistance: number = 150; // 距離太近就逃跑
  private lastShotTime: number = 0;
  private shotCooldown: number = 1000; // 1 秒射擊間隔

  constructor(scene: Phaser.Scene, x: number, y: number, damage = 0) {
    super(scene, x, y, "skeleton", damage);
    this.speed = 40;
    this.setWeapon(new BowStrategy(), "bow");
    this.attackDamage = 5;
  }

  public override updateBehavior() {
    if (!this.target) return;

    if (this.weaponSprite) this.updateWeaponRotation();

    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );

    // 距離太近 -> 逃跑
    if (dist < this.keepDistance) {
      const angle = Phaser.Math.Angle.Between(
        this.target.x,
        this.target.y,
        this.x,
        this.y
      );
      this.sceneRef.physics.velocityFromRotation(
        angle,
        this.speed,
        this.body?.velocity
      );
    }
    // 遠一些 -> 射擊
    else if (dist < this.attackRange) {
      this.setVelocity(0, 0);

      const now = this.sceneRef.time.now;
      if (now - this.lastShotTime >= this.shotCooldown) {
        this.attack();
        this.lastShotTime = now;
      }
    }
    // 遠離攻擊範圍 -> 追蹤
    else {
      super.updateBehavior();
    }
  }
}

