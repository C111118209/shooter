import Phaser from "phaser";

/**
 * 箭矢 / 投擲物
 * 可用於玩家或敵人發射。
 */
export class ArrowMob extends Phaser.Physics.Arcade.Image {
  public damage: number = 0; // 傷害
  private lifetime: number = 1500; // 存活時間 (ms)
  private initialized: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, key = "arrow") {
    super(scene, x, y, key);

    // 只在第一次加入場景時執行
    if (!this.initialized) {
      scene.add.existing(this);
      scene.physics.add.existing(this);
      (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.setScale(0.2);
      this.initialized = true;
    }
  }

  /**
   * 初始化或重設箭矢狀態（相容 group.get()）
   */
  fire(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    damage: number
  ) {
    this.setPosition(startX, startY);
    this.setActive(true);
    this.setVisible(true);
    this.damage = damage;

    // 根據滑鼠位置算角度
    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    this.setRotation(angle);

    // 給予箭矢速度
    const speed = 600;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // 確保箭不受重力
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // 一段時間後自動銷毀
    this.scene.time.delayedCall(this.lifetime, () => {
      this.destroy();
    });
  }
}
