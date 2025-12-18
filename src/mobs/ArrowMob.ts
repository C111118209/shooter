import Phaser from "phaser";

/**
 * 箭矢 / 投擲物
 * 改繼承 Sprite 以支援 preUpdate 自動循環
 */
export class ArrowMob extends Phaser.Physics.Arcade.Sprite {
  public damage: number = 0;
  private lifetime: number = 1500;
  private elapsed: number = 0;
  private savedVelocity: { x: number; y: number } | null = null;
  private wasPaused: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, key = "arrow") {
    // 改用 Sprite 的構造函數
    super(scene, x, y, key);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    this.setScale(0.2);
    this.setSize(12, 12);
  }

  fire(startX: number, startY: number, targetX: number, targetY: number, damage: number) {
    this.setPosition(startX, startY);
    this.setActive(true);
    this.setVisible(true);
    this.damage = damage;
    this.elapsed = 0;

    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    this.setRotation(angle);

    const speed = 600;
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    if (this.body) {
      this.setVelocity(velocityX, velocityY);
    }
    this.savedVelocity = { x: velocityX, y: velocityY };
  }

  // 現在 Sprite 正確支援 preUpdate
  preUpdate(t: number, dt: number) {
    // 注意：必須呼叫 super.preUpdate 以維持內部的動畫與物理更新
    super.preUpdate(t, dt);

    // 獲取場景暫停狀態（假設 GameScene 有 public isPaused）
    const isPaused = (this.scene as any).isPaused;

    if (isPaused) {
      if (!this.wasPaused) {
        if (this.body) {
          this.savedVelocity = {
            x: this.body.velocity.x,
            y: this.body.velocity.y
          };
          this.body.stop();
        }
        this.wasPaused = true;
      }
      return;
    }

    if (this.wasPaused) {
      if (this.body && this.savedVelocity) {
        this.setVelocity(this.savedVelocity.x, this.savedVelocity.y);
      }
      this.wasPaused = false;
    }

    // 處理生命週期
    this.elapsed += dt;
    if (this.elapsed >= this.lifetime) {
      this.destroy();
    }
  }
}