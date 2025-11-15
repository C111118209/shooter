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
  private savedVelocity: { x: number; y: number } | null = null;
  private wasPaused: boolean = false;

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
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    this.setVelocity(velocityX, velocityY);
    this.savedVelocity = { x: velocityX, y: velocityY };

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
    const isPaused = gameScene.isPaused;

    // 處理暫停狀態變化
    if (isPaused && !this.wasPaused) {
      // 剛進入暫停狀態：保存當前速度並停止
      if (this.body && this.body.velocity) {
        this.savedVelocity = {
          x: this.body.velocity.x,
          y: this.body.velocity.y
        };
        this.body.stop();
      }
      this.wasPaused = true;
    } else if (!isPaused && this.wasPaused) {
      // 剛從暫停恢復：恢復保存的速度
      if (this.body && this.savedVelocity) {
        this.setVelocity(this.savedVelocity.x, this.savedVelocity.y);
      }
      this.wasPaused = false;
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
