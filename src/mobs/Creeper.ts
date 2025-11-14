import { BaseMob } from "./BaseMob";

/**
 * 💣 CreeperMob：接近玩家後爆炸
 * ------------------------------------------
 * 模擬爆炸範圍傷害的怪物。
 */
export class CreeperMob extends BaseMob {
  private explodeRange = 100; // 觸發爆炸的距離
  private explosionDamage = 75; // 爆炸基礎傷害值
  private explosionRadius = 100; // 爆炸半徑

  // --- 新增變數 ---
  private isPreparingToExplode = false; // 是否處於預備爆炸狀態
  private blinkCount = 3; // 閃爍次數
  private blinkDuration = 100; // 每次閃爍持續時間 (0.1秒)
  // -----------------

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "creeper");
    this.speed = 70;
  }

  public override updateBehavior() {
    super.updateBehavior();

    if (!this.target) return;

    // // 確保目標（玩家）仍然存在且活躍
    // if (!this.target.active) return;

    // 如果正在準備爆炸，則停止所有行為
    if (this.isPreparingToExplode) {
      // 停止移動
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );

    // 苦力怕進入範圍後，不再是直接爆炸，而是進入準備階段
    if (dist < this.explodeRange) {
      this.startExplosionCountdown();
    }
  }

  /**
   * 進入爆炸倒數階段
   */
  private startExplosionCountdown() {
    // 避免重複啟動倒數
    if (this.isPreparingToExplode) return;

    this.isPreparingToExplode = true;
    this.setVelocity(0, 0); // 停止移動

    // 執行三次閃爍
    let currentBlink = 0;
    const totalBlinkDuration = this.blinkCount * this.blinkDuration * 2; // 3次閃爍 = 3*亮+3*暗

    // 1. 設定閃爍邏輯
    const blinkTimer = this.sceneRef.time.addEvent({
      delay: this.blinkDuration,
      callback: () => {
        if (currentBlink < this.blinkCount * 2) {
          // 奇數次是變暗，偶數次是變亮 (alpha=1)
          if (currentBlink % 2 === 0) {
            this.setAlpha(0.3); // 變暗
          } else {
            this.setAlpha(1); // 變亮
          }
          currentBlink++;
        } else {
          // 閃爍完成，清除計時器 (雖然我們在 complete 後也會清除，但這是個好習慣)
          blinkTimer.remove();
        }
      },
      callbackScope: this,
      loop: true,
    });

    // 2. 設定總時間結束後爆炸
    this.sceneRef.time.delayedCall(totalBlinkDuration, this.explode, [], this);
  }

  /**
   * 爆炸邏輯 (與原版相同，但確保 alpha 被重置為 1)
   */
  private explode() {
    // 避免重複爆炸 (如果已經發出事件或正在銷毀)
    if (!this.active) return;

    // 重設 Alpha 以確保視覺效果正確
    this.setAlpha(1);

    // 1. 發射事件通知 GameScene 處理傷害和碰撞
    this.emit("creeper-explode", {
      x: this.x,
      y: this.y,
      damage: this.explosionDamage,
      radius: this.explosionRadius,
    });

    // 2. 視覺效果：爆炸圈
    const explosion = this.sceneRef.add.circle(
      this.x,
      this.y,
      this.explosionRadius * 0.5,
      0xff0000,
      0.5
    );
    this.sceneRef.tweens.add({
      targets: explosion,
      scale: 1.5, // 爆炸擴散
      alpha: 0,
      duration: 400,
      ease: "Quad.easeOut",
      onComplete: () => explosion.destroy(),
    });

    // 3. 銷毀苦力怕本身
    this.destroy();
  }
}
