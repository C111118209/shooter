import Phaser from "phaser";
import type GameScene from "../scenes/GameScene";

/**
 * 箭矢 / 投擲物
 * 可用於玩家或敵人發射。
 */
export class ArrowMob extends Phaser.Physics.Arcade.Image {
  public damage: number = 0;
  private lifetime: number = 1500;
  private lifetimeEvent?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, key = "arrow") {
    super(scene, x, y, key);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setScale(0.2);
    this.setSize(12, 12)
  }

  fire(startX: number, startY: number, targetX: number, targetY: number, damage: number) {
    this.setPosition(startX, startY);
    this.setActive(true);
    this.setVisible(true);
    this.damage = damage;

    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    this.setRotation(angle);

    const speed = 600;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // 取消之前的計時器（避免多重 destroy）
    if (this.lifetimeEvent) {
      const gameScene = this.scene as GameScene;
      gameScene.removeGameTimer(this.lifetimeEvent);
      this.lifetimeEvent.destroy();
    }

    // 🆕 使用 gameTick 系統建立新的計時器
    const gameScene = this.scene as GameScene;
    this.lifetimeEvent = gameScene.addGameTimer({
      delay: this.lifetime,
      callback: () => {
        gameScene.removeGameTimer(this.lifetimeEvent!);
        this.destroy();
      },
    });
  }

  preUpdate(t: number, dt: number) {
    super.update(t, dt);
    const gameScene = this.scene as GameScene;

    // 暫停期間不更新
    if (gameScene.isPaused) {
      this.body!.stop(); // 停止物理
      return;
    }
  }

  destroy(fromScene?: boolean) {
    // 清理計時器
    if (this.lifetimeEvent) {
      const gameScene = this.scene as GameScene;
      gameScene.removeGameTimer(this.lifetimeEvent);
      this.lifetimeEvent.destroy();
      this.lifetimeEvent = undefined;
    }
    super.destroy(fromScene);
  }
}
