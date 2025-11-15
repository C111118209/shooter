import type { Player } from "../player/Player";
import { GameManager } from "../core/GameManager";
import {
  HealthBoostDecorator,
  HealingDecorator,
  DamageBoostDecorator,
  SpeedBoostDecorator,
} from "../player/IPlayerDecorator";
import type { IPlayerDecorator } from "../player/IPlayerDecorator";
import { GLOBAL_TEXT_STYLE } from "./GameScene";

export default class UIScene extends Phaser.Scene {
  private gameManager!: GameManager;
  private mainMenuContainer!: Phaser.GameObjects.Container; // 新增主選單容器
  private scoreText!: Phaser.GameObjects.Text;
  private healthBarGraphics!: Phaser.GameObjects.Graphics;
  private deathMenuContainer!: Phaser.GameObjects.Container;
  private pauseText!: Phaser.GameObjects.Text;
  private weaponNameText!: Phaser.GameObjects.Text;

  // 新增等級和經驗值相關的 UI 元素
  private levelText!: Phaser.GameObjects.Text;
  private xpBarGraphics!: Phaser.GameObjects.Graphics;

  // 升級選擇界面容器
  private upgradeMenuContainer!: Phaser.GameObjects.Container;

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
    this.player = data.player; // 接收 Player
  }

  create() {
    this.scene.bringToTop();

    // 初始化 GameManager
    this.gameManager = GameManager.getInstance();

    // 通過 GameManager 監聽所有事件（統一的事件總線）
    this.gameManager.on("update-stats", this.updateHUD, this);
    this.gameManager.on("player-die", this.showDeathMenu, this);
    this.gameManager.on("game-paused", this.togglePauseText, this);
    this.gameManager.on("weapon-change", this.updateWeaponDisplay, this);
    this.gameManager.on("player-level-up", this.showUpgradeMenu, this);

    // 創建所有 UI 元素 (初始隱藏 HUD 和死亡選單)
    this.createHUD();
    this.createPauseText();
    this.createDeathMenu();
    this.createUpgradeMenu();
    this.setHUDVisibility(false);

    // 顯示主選單
    this.createMainMenu();
  }

  public handleResize(gameSize: Phaser.Structs.Size) {
    // 更新武器名稱文字位置（右上角）
    if (this.weaponNameText) {
      this.weaponNameText.setX(gameSize.width - 15);
    }

    // 更新主選單容器位置（居中）
    if (this.mainMenuContainer && this.mainMenuContainer.visible) {
      this.mainMenuContainer.setX(gameSize.width / 2);
      this.mainMenuContainer.setY(gameSize.height / 2);
    }

    // 更新暫停文字位置（居中）
    if (this.pauseText) {
      this.pauseText.setX(gameSize.width / 2);
      this.pauseText.setY(gameSize.height / 2);
    }

    // 更新死亡選單容器位置（居中）
    if (this.deathMenuContainer && this.deathMenuContainer.visible) {
      this.deathMenuContainer.setX(gameSize.width / 2);
      this.deathMenuContainer.setY(gameSize.height / 2);
    }

    // 更新升級選單容器位置（居中）
    if (this.upgradeMenuContainer && this.upgradeMenuContainer.visible) {
      this.upgradeMenuContainer.setX(gameSize.width / 2);
      this.upgradeMenuContainer.setY(gameSize.height / 2);
    }
  }

  update() {
    // 只有在遊戲進行中（或不在升級選單中）才持續更新 HUD
    if (!this.player || this.gameManager.paused) return;

    this.updateHUD({
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      xp: this.player.xp,
      level: this.player.level,
      xpToNextLevel: this.player.xpToNextLevel // 確保經驗條比例正確
    });
  }

  /** 創建並顯示主選單 */
  private createMainMenu() {
    // 清理殘留的死亡選單
    this.deathMenuContainer.setVisible(false);

    const { centerX, centerY } = this.cameras.main;

    // 主標題（大字）
    const mainText = this.add
      .text(0, -100, "射擊遊戲", { ...GLOBAL_TEXT_STYLE, fontSize: "72px", padding: { x: 30, y: 15 } })
      .setOrigin(0.5);

    // 副標題
    const subText = this.add
      .text(0, -30, "數字鍵：[1]弓箭 [2]劍 [3]TNT", { ...GLOBAL_TEXT_STYLE, fontSize: "32px", backgroundColor: "#00000077" })
      .setOrigin(0.5);

    // 開始遊戲按鈕
    const startButton = this.add
      .text(0, 50, "開始遊戲", { ...GLOBAL_TEXT_STYLE, fontSize: "48px", backgroundColor: "#228b22" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.startGame())
      .on("pointerover", () => startButton.setBackgroundColor("#3cb371"))
      .on("pointerout", () => startButton.setBackgroundColor("#228b22"));

    // GitHub 連結
    const githubLink = this.add
      .text(0, 150, "GitHub 專案連結", { ...GLOBAL_TEXT_STYLE, fontSize: "24px", color: "#00aaff", backgroundColor: "#00000055" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => window.open("https://github.com/C111118209/shooter", "_blank"))
      .on("pointerover", () => githubLink.setStyle({ color: "#66ddff" }))
      .on("pointerout", () => githubLink.setStyle({ color: "#00aaff" }));

    // 將所有文字加入容器
    this.mainMenuContainer = this.add
      .container(centerX, centerY, [mainText, subText, startButton, githubLink])
      .setScrollFactor(0)
      .setDepth(300)
      .setVisible(true);

    // 暫停遊戲
    if (this.gameManager) {
      this.gameManager.setPause(true);
    }
  }

  /** 移除主選單並啟動/恢復 GameScene */
  private startGame() {
    // 修正 2: 隱藏並銷毀主選單容器
    this.mainMenuContainer.setVisible(false);
    this.mainMenuContainer.destroy();

    // 使用 GameManager 通知遊戲開始
    this.gameManager.notifyGameStarted();
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
      .text(
        16,
        16,
        `得分: ${this.currentScore} | HP: ${this.currentHealth}/${this.currentMaxHealth}`,
        {
          ...GLOBAL_TEXT_STYLE,
          fontSize: "24px",
          backgroundColor: "#00000088",
          padding: { x: 10, y: 5 },
        }
      )
      .setScrollFactor(0)
      .setDepth(hudDepth);

    // 血條圖形 (位於分數文字下方)
    this.healthBarGraphics = this.add
      .graphics({ x: 16, y: 55 })
      .setScrollFactor(0)
      .setDepth(hudDepth);

    // 等級文字 (位於血條下方, 85px)
    this.levelText = this.add
      .text(
        16,
        85,
        `等級: ${this.currentLevel} | XP: ${this.currentXp}/${this.currentXpToNextLevel}`,
        {
          ...GLOBAL_TEXT_STYLE,
          fontSize: "20px",
          backgroundColor: "#00000088",
          padding: { x: 10, y: 5 },
        }
      )
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
        ...GLOBAL_TEXT_STYLE,
        fontSize: "20px",
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
        ...GLOBAL_TEXT_STYLE,
        fontSize: "60px",
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
        ...GLOBAL_TEXT_STYLE,
        fontSize: "64px",
        color: "#ff0000",
        padding: { x: 15, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    const finalScoreText = this.add
      .text(0, 0, `最終得分: ${this.currentScore}`, {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "36px",
        padding: { x: 15, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    const restartButton = this.add
      .text(0, 100, "重新開始", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "36px",
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
      ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffa500 : 0xff0000;

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

  public showHUD(bool: boolean) {
    this.setHUDVisibility(bool);
    this.pauseText.setVisible(bool);
  }

  /** 切換暫停文字顯示 */
  private togglePauseText(isPaused: boolean) {
    // 如果升級選單正在顯示，不顯示暫停文字
    if (this.upgradeMenuContainer.visible || this.player?.isDead) {
      this.pauseText.setVisible(false);
      return;
    }

    this.pauseText.setVisible(isPaused);
    this.setHUDVisibility(!isPaused);
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
    // this.pauseText.setVisible(false); // 暫停文字獨立控制

    // XP 相關 UI
    this.levelText.setVisible(visible);
    this.xpBarGraphics.setVisible(visible);
  }

  /** 獲取所有可用的升級選項 */
  private getAvailableUpgrades(): {
    UpgradeClass: { new(player: Player): IPlayerDecorator };
    description: string;
  }[] {
    return [
      {
        UpgradeClass: HealthBoostDecorator,
        description: "❤️ 最大血量 +10~30",
      },
      {
        UpgradeClass: HealingDecorator,
        description: "✨ 立即恢復 HP +10~50",
      },
      {
        UpgradeClass: DamageBoostDecorator,
        description: "⚔️ 攻擊傷害 +5",
      },
      {
        UpgradeClass: SpeedBoostDecorator,
        description: "👟 移動速度 +20",
      },
    ];
  }

  /** 創建升級選擇界面 */
  private createUpgradeMenu() {
    const { centerX, centerY } = this.cameras.main;

    // 標題文字
    const titleText = this.add
      .text(0, -250, "等級提升！選擇一個加成", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "48px",
        color: "#ffd700",
        backgroundColor: "#000000aa",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(1);

    // 創建容器（初始隱藏）
    this.upgradeMenuContainer = this.add
      .container(centerX, centerY, [titleText])
      .setDepth(300)
      .setScrollFactor(0)
      .setVisible(false);
  }

  /** 顯示升級選擇界面 */
  private showUpgradeMenu() {
    if (!this.player) return;

    // 先隱藏暫停文字，避免在升級選單顯示時出現
    this.pauseText.setVisible(false);

    // 暫停遊戲
    this.gameManager.setPause(true);
    this.setHUDVisibility(false);

    // 設置半透明背景（UIScene 的相機）
    this.cameras.main.setBackgroundColor("rgba(0, 0, 0, 0.7)");

    // 設置 GameScene 的相機背景為半透明
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.cameras.main.setBackgroundColor("rgba(0, 0, 0, 0.7)");
    }

    // 獲取所有可用的升級選項
    const availableUpgrades = this.getAvailableUpgrades();

    // 清理舊的升級選項（如果有的話）
    const children = this.upgradeMenuContainer.list;
    // 保留標題（第一個元素），移除其他
    while (children.length > 1) {
      const child = children[children.length - 1];
      if (child instanceof Phaser.GameObjects.GameObject) {
        child.destroy();
      }
      children.pop();
    }

    // 隨機選擇三個不重複的加成
    const selectedUpgrades = Phaser.Utils.Array.Shuffle(
      availableUpgrades
    ).slice(0, 3);

    const offsets = [-200, 0, 200];
    selectedUpgrades.forEach((upgradeData, index) => {
      this.createUpgradeOption(
        offsets[index],
        0,
        upgradeData.description,
        upgradeData.UpgradeClass
      );
    });

    // 顯示升級選單
    this.upgradeMenuContainer.setVisible(true);
  }

  /** 創建升級選項 */
  private createUpgradeOption(
    x: number,
    y: number,
    description: string,
    UpgradeClass: { new(player: Player): IPlayerDecorator }
  ) {
    const box = this.add
      .rectangle(x, y, 180, 180, 0x333333)
      .setStrokeStyle(4, 0xffd700)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);

    const text = this.add
      .text(x, y, description, {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "20px",
        wordWrap: { width: 160 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(1);

    // 添加到容器中
    this.upgradeMenuContainer.add([box, text]);

    if (!this.player) return;

    const upgradeInstance = new UpgradeClass(this.player);

    box.on("pointerdown", () => this.selectUpgrade(upgradeInstance));
    box.on("pointerover", () => box.setFillStyle(0x555555));
    box.on("pointerout", () => box.setFillStyle(0x333333));
  }

  /** 選擇升級 */
  private selectUpgrade(decorator: IPlayerDecorator) {
    // 應用裝飾器效果
    decorator.apply();

    // 隱藏升級選單
    this.upgradeMenuContainer.setVisible(false);

    // 恢復 UIScene 的背景顏色（透明或默認）
    this.cameras.main.setBackgroundColor("rgba(0, 0, 0, 0)");

    // 恢復 GameScene 的背景顏色
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.cameras.main.setBackgroundColor("#4488AA");
    }

    // 恢復 HUD 顯示
    this.setHUDVisibility(true);

    // 使用 GameManager 恢復遊戲
    this.gameManager.setPause(false);
  }
}