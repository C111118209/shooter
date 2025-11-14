export default class UIScene extends Phaser.Scene {
  private mainMenuContainer!: Phaser.GameObjects.Container; // 新增主選單容器
  private scoreText!: Phaser.GameObjects.Text;
  private healthBarGraphics!: Phaser.GameObjects.Graphics;
  private deathMenuContainer!: Phaser.GameObjects.Container;
  private pauseText!: Phaser.GameObjects.Text;
  private weaponIcon!: Phaser.GameObjects.Image;
  private weaponNameText!: Phaser.GameObjects.Text;
  private currentScore: number = 0;

  constructor() {
    super("UIScene");
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
    }

    // 創建所有 UI 元素 (初始隱藏 HUD 和死亡選單)
    this.createHUD();
    this.createPauseText();
    this.createDeathMenu();
    this.setHUDVisibility(false);

    // 顯示主選單
    this.createMainMenu();
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
  }

  /** 創建 HUD 元素 (分數, 血條, 武器) */
  private createHUD() {
    const { width } = this.cameras.main;
    const hudDepth = 150;

    // 分數和文字 HUD
    this.scoreText = this.add
      .text(16, 16, "得分: 0 | HP: 100/100", {
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

    this.weaponIcon = this.add
      .image(width - 45, 45, "bow")
      .setScale(0.6)
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
  }

  /** 重新啟動遊戲 */
  private restartGame() {
    // 修正 3: 隱藏死亡選單，停止並重新啟動 GameScene
    this.deathMenuContainer.setVisible(false);
    this.scene.stop("GameScene");
    this.scene.start("GameScene");

    // 重新顯示主選單 (GameScene 會在 create 中等待這個事件)
    this.createMainMenu();
  }

  /** 更新血量、分數等 HUD 資訊 */
  private updateHUD(data: {
    health: number;
    maxHealth: number;
    score: number;
  }) {
    const { health, maxHealth, score } = data;
    this.currentScore = score;
    this.scoreText.setText(`得分: ${score} | HP: ${health}/${maxHealth}`);

    this.healthBarGraphics.clear();

    const barWidth = 200;
    const barHeight = 20;

    // 背景
    this.healthBarGraphics.fillStyle(0x555555);
    this.healthBarGraphics.fillRect(0, 0, barWidth, barHeight);

    // 血量條
    const healthColor =
      health > maxHealth * 0.5
        ? 0x00ff00
        : health > maxHealth * 0.25
        ? 0xffa500
        : 0xff0000;
    const healthWidth = (health / maxHealth) * barWidth;
    this.healthBarGraphics.fillStyle(healthColor);
    this.healthBarGraphics.fillRect(0, 0, healthWidth, barHeight);
  }

  /** 切換暫停文字顯示 */
  private togglePauseText(isPaused: boolean) {
    this.pauseText.setVisible(isPaused);
  }

  /** 更新武器圖標和名稱 */
  private updateWeaponDisplay(data: { key: string; name: string }) {
    this.weaponIcon.setTexture(data.key);
    this.weaponNameText.setText(`${data.name}`);
  }

  private setHUDVisibility(visible: boolean) {
    this.scoreText.setVisible(visible);
    this.healthBarGraphics.setVisible(visible);
    this.weaponIcon.setVisible(visible);
    this.weaponNameText.setVisible(visible);
    this.pauseText.setVisible(false);
  }
}
