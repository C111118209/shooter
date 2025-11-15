import type { Player } from "../player/Player";

export default class UIScene extends Phaser.Scene {
  private mainMenuContainer!: Phaser.GameObjects.Container; // 新增主選單容器
  private scoreText!: Phaser.GameObjects.Text;
  private healthBarGraphics!: Phaser.GameObjects.Graphics;
  private deathMenuContainer!: Phaser.GameObjects.Container;
  private pauseText!: Phaser.GameObjects.Text;
  private weaponNameText!: Phaser.GameObjects.Text;

  // 新增等級和經驗值相關的 UI 元素
  private levelText!: Phaser.GameObjects.Text;
  private xpBarGraphics!: Phaser.GameObjects.Graphics;

  private currentScore: number = 0;
  private currentHealth: number = 100;
  private currentMaxHealth: number = 100;

  // 新增等級和經驗值相關的狀態
  private currentLevel: number = 1;
  private currentXp: number = 0;
  private currentXpToNextLevel: number = 5;

  private player?: Player;

  constructor() {
    super("UIScene");
  }

  init(data: { player: Player }) {
    this.player = data.player;  // 接收 Player
  }

  create() {
    this.scene.bringToTop();

    // 監聽 GameScene 的事件
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.events.on("update-stats", this.updateHUD, this);
      gameScene.events.on("player-die", this.showDeathMenu, this);
      gameScene.events.on("game-paused", this.togglePauseText, this);
      gameScene.events.on("weapon-change", this.updateWeaponDisplay, this);
      // 注意: 玩家升級事件 (player-level-up) 可以額外處理，例如播放動畫
      // gameScene.events.on("player-level-up", this.showLevelUpNotification, this);
    }

    // 創建所有 UI 元素 (初始隱藏 HUD 和死亡選單)
    this.createHUD();
    this.createPauseText();
    this.createDeathMenu();
    this.setHUDVisibility(false);

    // 顯示主選單
    this.createMainMenu();
  }

  update() {
    if (!this.player) return;

    this.updateHUD({
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      xp: this.player.xp,
      level: this.player.level
    });
  }

  /** 創建並顯示主選單 */
  private createMainMenu() {
    // 清理殘留的死亡選單
    this.deathMenuContainer.setVisible(false);

    const { centerX, centerY } = this.cameras.main;

    const mainText = this.add
      .text(0, -100, "Minecraft Survivors", {
        fontSize: "72px",
        color: "#fff",
        backgroundColor: "#000000aa",
        padding: { x: 30, y: 15 },
      })
      .setOrigin(0.5);

    const startButton = this.add
      .text(0, 50, "開始遊戲", {
        fontSize: "48px",
        color: "#ffffff",
        backgroundColor: "#228b22",
        padding: { x: 30, y: 15 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.startGame())
      .on("pointerover", () => startButton.setBackgroundColor("#3cb371"))
      .on("pointerout", () => startButton.setBackgroundColor("#228b22"));

    this.mainMenuContainer = this.add
      .container(centerX, centerY, [mainText, startButton])
      .setScrollFactor(0)
      .setDepth(300)
      .setVisible(true);

    // 確保 GameScene 處於暫停狀態
    this.scene.get("GameScene").physics.pause();
  }

  /** 移除主選單並啟動/恢復 GameScene */
  private startGame() {
    // 修正 2: 隱藏並銷毀主選單容器
    this.mainMenuContainer.setVisible(false);
    this.mainMenuContainer.destroy();

    const gameScene = this.scene.get("GameScene");
    gameScene.events.emit("game-started"); // 通知 GameScene 開始遊戲
    gameScene.physics.resume();
    this.setHUDVisibility(true);

    // 立即觸發一次 HUD 更新，以確保初始數據正確顯示
    this.updateHUD({});
  }

  /** 創建 HUD 元素 (分數, 血條, 武器, 等級, 經驗值條) */
  private createHUD() {
    const { width } = this.cameras.main;
    const hudDepth = 150;

    // 分數和血量文字 HUD (更新為包含 HP 資訊)
    this.scoreText = this.add
      .text(16, 16, `得分: ${this.currentScore} | HP: ${this.currentHealth}/${this.currentMaxHealth}`, {
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(hudDepth);

    // 血條圖形 (位於分數文字下方)
    this.healthBarGraphics = this.add
      .graphics({ x: 16, y: 55 })
      .setScrollFactor(0)
      .setDepth(hudDepth);

    // 等級文字 (位於血條下方, 85px)
    this.levelText = this.add
      .text(16, 85, `等級: ${this.currentLevel} | XP: ${this.currentXp}/${this.currentXpToNextLevel}`, {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(hudDepth);

    // 經驗值條圖形 (位於等級文字下方, 115px)
    this.xpBarGraphics = this.add
      .graphics({ x: 16, y: 115 })
      .setScrollFactor(0)
      .setDepth(hudDepth);

    // 武器顯示 (右上角)
    this.weaponNameText = this.add
      .text(width - 15, 16, "🏹 弓", {
        fontSize: "20px",
        color: "#fff",
        backgroundColor: "#00000088",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(hudDepth);
  }

  /** 創建暫停文字 */
  private createPauseText() {
    const { centerX, centerY } = this.cameras.main;
    this.pauseText = this.add
      .text(centerX, centerY, "遊戲暫停 (ESC/P)", {
        // 更新為 ESC/P
        fontSize: "60px",
        color: "#fff",
        backgroundColor: "#000000aa",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setScrollFactor(0)
      .setVisible(false);
  }

  /** 創建死亡選單 (初始隱藏) */
  private createDeathMenu() {
    const { centerX, centerY } = this.cameras.main;

    const background = this.add
      .rectangle(0, 0, 450, 350, 0x000000, 0.8)
      .setDepth(1);
    const title = this.add
      .text(0, -100, "遊戲結束", {
        fontSize: "64px",
        color: "#ff0000",
        padding: { x: 15, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    const finalScoreText = this.add
      .text(0, 0, `最終得分: ${this.currentScore}`, {
        fontSize: "36px",
        color: "#ffffff",
        padding: { x: 15, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    const restartButton = this.add
      .text(0, 100, "重新開始", {
        fontSize: "36px",
        color: "#ffffff",
        backgroundColor: "#4caf50",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.restartGame())
      .on("pointerover", () => restartButton.setBackgroundColor("#66bb6a"))
      .on("pointerout", () => restartButton.setBackgroundColor("#4caf50"))
      .setDepth(2);

    this.deathMenuContainer = this.add
      .container(centerX, centerY, [
        background,
        title,
        finalScoreText,
        restartButton,
      ])
      .setDepth(250)
      .setScrollFactor(0)
      // 修正 3: 確保死亡選單一開始是不可見的，並在死亡時才顯示
      .setVisible(false);

    this.deathMenuContainer.setData("scoreText", finalScoreText);
  }

  /** 處理玩家死亡事件 */
  private showDeathMenu() {
    const finalScoreText = this.deathMenuContainer.getData(
      "scoreText"
    ) as Phaser.GameObjects.Text;
    finalScoreText.setText(`最終得分: ${this.currentScore}`);
    this.deathMenuContainer.setVisible(true);
    this.setHUDVisibility(false);
    this.events.emit("game-paused", true);
  }

  /** 重新啟動遊戲 */
  private restartGame() {
    // 修正: 隱藏死亡選單，停止並重新啟動 GameScene
    this.deathMenuContainer.setVisible(false);
    this.scene.stop("GameScene");
    this.scene.start("GameScene");

    // 重新顯示主選單 (GameScene 會在 create 中等待這個事件)
    this.createMainMenu();
  }

  /** 更新血量 / 分數 / 經驗值 / 等級 UI */
  private updateHUD(data: {
    health?: number;
    maxHealth?: number;
    score?: number;
    xp?: number; // 經驗值
    xpToNextLevel?: number; // 升級所需經驗值
    level?: number; // 等級
  }) {
    const { health, maxHealth, score, xp, xpToNextLevel, level } = data;

    // 分數更新
    if (score !== undefined) {
      this.currentScore = score;
    }

    // 血量更新
    if (health !== undefined) this.currentHealth = health;
    if (maxHealth !== undefined) this.currentMaxHealth = maxHealth;

    // 經驗值 / 等級更新
    if (level !== undefined) this.currentLevel = level;
    if (xp !== undefined) this.currentXp = xp;
    if (xpToNextLevel !== undefined) this.currentXpToNextLevel = xpToNextLevel;

    // 更新分數和血量文字
    this.scoreText.setText(
      `得分: ${this.currentScore} | HP: ${this.currentHealth}/${this.currentMaxHealth}`
    );

    // 更新等級和經驗值文字
    this.levelText.setText(
      `等級: ${this.currentLevel} | XP: ${this.currentXp}/${this.currentXpToNextLevel}`
    );

    this.drawHealthBar();
    this.drawXpBar(); // 繪製經驗值條
  }

  /** 繪製血條 */
  private drawHealthBar() {
    const { currentHealth: hp, currentMaxHealth: maxHp } = this;

    this.healthBarGraphics.clear();

    const barWidth = 200;
    const barHeight = 20;

    // 背景
    this.healthBarGraphics.fillStyle(0x555555);
    this.healthBarGraphics.fillRect(0, 0, barWidth, barHeight);

    // 安全避免 NaN
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const fillWidth = ratio * barWidth;

    const fillColor =
      ratio > 0.5 ? 0x00ff00 :
        ratio > 0.25 ? 0xffa500 :
          0xff0000;

    this.healthBarGraphics.fillStyle(fillColor);
    this.healthBarGraphics.fillRect(0, 0, fillWidth, barHeight);
  }

  /** 繪製經驗值條 */
  private drawXpBar() {
    const { currentXp: xp, currentXpToNextLevel: maxXp } = this;

    this.xpBarGraphics.clear();

    const barWidth = 200;
    const barHeight = 10; // XP 條可以細一點

    // 背景 (灰色)
    this.xpBarGraphics.fillStyle(0x333333);
    this.xpBarGraphics.fillRect(0, 0, barWidth, barHeight);

    // 安全避免 NaN 或除以零 (如果 maxXp 是 0，則比例為 0)
    const ratio = maxXp > 0 ? Math.max(0, Math.min(1, xp / maxXp)) : 0;
    const fillWidth = ratio * barWidth;

    // 填充顏色 (亮黃色)
    const fillColor = 0xffd700;

    this.xpBarGraphics.fillStyle(fillColor);
    this.xpBarGraphics.fillRect(0, 0, fillWidth, barHeight);
  }

  /** 切換暫停文字顯示 */
  private togglePauseText(isPaused: boolean) {
    this.pauseText.setVisible(isPaused);
  }

  /** 更新武器圖標和名稱 */
  private updateWeaponDisplay(data: { key: string; name: string }) {
    if (this.weaponNameText) {
      this.weaponNameText.setText(`${data.name}`);
    }
  }

  /** 設定 HUD 介面整體可見性 */
  private setHUDVisibility(visible: boolean) {
    this.scoreText.setVisible(visible);
    this.healthBarGraphics.setVisible(visible);
    this.weaponNameText.setVisible(visible);
    this.pauseText.setVisible(false); // 暫停文字獨立控制

    // 新增 XP 相關 UI
    this.levelText.setVisible(visible);
    this.xpBarGraphics.setVisible(visible);
  }
}