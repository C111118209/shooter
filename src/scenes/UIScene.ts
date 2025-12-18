import Phaser from "phaser";
import type { Player } from "../player/Player";
import { GameManager } from "../core/GameManager";
import {
  HealthBoostDecorator,
  HealingDecorator,
  DamageBoostDecorator,
  SpeedBoostDecorator,
  type IPlayerDecorator,
} from "../player/IPlayerDecorator";
import { GLOBAL_TEXT_STYLE } from "./GameScene";
import { MapFileAdapter } from "../maps/MapFileAdapter";

export default class UIScene extends Phaser.Scene {
  private gameManager!: GameManager;
  private mainMenuContainer!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private healthBarGraphics!: Phaser.GameObjects.Graphics;
  private deathMenuContainer!: Phaser.GameObjects.Container;
  private pauseText!: Phaser.GameObjects.Text;
  private weaponNameText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpBarGraphics!: Phaser.GameObjects.Graphics;
  private upgradeMenuContainer!: Phaser.GameObjects.Container;

  private currentScore: number = 0;
  private currentHealth: number = 100;
  private currentMaxHealth: number = 100;
  private currentLevel: number = 1;
  private currentXp: number = 0;
  private currentXpToNextLevel: number = 5;

  private player?: Player;
  private mapFileInput?: HTMLInputElement;
  private mapAdapter = new MapFileAdapter();
  private mapStatusText?: Phaser.GameObjects.Text;

  private canSelectUpgrade: boolean = false;

  constructor() {
    super("UIScene");
  }

  init(data: { player: Player }) {
    this.player = data.player;
  }

  create() {
    this.scene.bringToTop();
    this.gameManager = GameManager.getInstance();

    // 更新監聽事件
    this.gameManager.on("update-stats", this.updateHUD, this);
    this.gameManager.on("player-die", this.showDeathMenu, this);
    this.gameManager.on("pause-changed", this.handlePauseChange, this); // 改名
    this.gameManager.on("weapon-change", this.updateWeaponDisplay, this);
    this.gameManager.on("player-level-up", this.showUpgradeMenu, this);

    this.createHUD();
    this.createPauseText();
    this.createDeathMenu();
    this.createUpgradeMenu();
    this.setHUDVisibility(false);
    this.createMainMenu();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.mapFileInput) {
        this.mapFileInput.remove();
        this.mapFileInput = undefined;
      }
    });
  }

  public handleResize(gameSize: Phaser.Structs.Size) {
    if (this.weaponNameText) this.weaponNameText.setX(gameSize.width - 15);
    const centerX = gameSize.width / 2;
    const centerY = gameSize.height / 2;

    if (this.mainMenuContainer?.visible)
      this.mainMenuContainer.setPosition(centerX, centerY);
    if (this.pauseText) this.pauseText.setPosition(centerX, centerY);
    if (this.deathMenuContainer?.visible)
      this.deathMenuContainer.setPosition(centerX, centerY);
    if (this.upgradeMenuContainer?.visible)
      this.upgradeMenuContainer.setPosition(centerX, centerY);
  }

  update() {
    if (!this.player || this.gameManager.isPaused) return;

    this.updateHUD({
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      xp: this.player.xp,
      level: this.player.level,
      xpToNextLevel: this.player.xpToNextLevel,
    });
  }

  private createMainMenu() {
    this.deathMenuContainer.setVisible(false);
    const { centerX, centerY } = this.cameras.main;

    const mainText = this.add
      .text(0, -100, "射擊遊戲", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "72px",
        padding: { x: 30, y: 15 },
      })
      .setOrigin(0.5);
    const subText = this.add
      .text(0, -30, "數字鍵：[1]弓箭 [2]劍 [3]TNT", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "32px",
        backgroundColor: "#00000077",
      })
      .setOrigin(0.5);

    const startButton = this.createButton(0, 50, "開始遊戲", "#228b22", () =>
      this.startGame()
    );
    const importButton = this.createButton(
      0,
      120,
      "匯入地圖 (JSON/CSV/TXT)",
      "#1e90ff",
      () => this.openMapPicker()
    );

    this.mapStatusText = this.add
      .text(0, 180, "未載入地圖，將使用預設配置", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "20px",
        backgroundColor: "#00000055",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5);

    const githubLink = this.add
      .text(0, 230, "GitHub 專案連結", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "24px",
        color: "#00aaff",
        backgroundColor: "#00000055",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () =>
        window.open("https://github.com/C111118209/shooter", "_blank")
      );

    this.mainMenuContainer = this.add
      .container(centerX, centerY, [
        mainText,
        subText,
        startButton,
        importButton,
        this.mapStatusText,
        githubLink,
      ])
      .setScrollFactor(0)
      .setDepth(300)
      .setVisible(true);

    // [System Pause] 主選單開啟時，使用系統暫停
    this.gameManager.setSystemPause("main-menu", true);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: string,
    onClick: () => void
  ) {
    const btn = this.add
      .text(x, y, text, {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "48px",
        backgroundColor: color,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", onClick);
    return btn;
  }

  private startGame() {
    this.mainMenuContainer.setVisible(false);
    this.mainMenuContainer.destroy();

    // [System Pause] 通知 GameManager 遊戲開始（它會移除 main-menu 的暫停鎖）
    this.gameManager.notifyGameStarted();

    this.setHUDVisibility(true);
    this.updateHUD({});
  }

  private openMapPicker() {
    const input = this.ensureMapFileInput();
    input.click();
  }

  private ensureMapFileInput(): HTMLInputElement {
    if (this.mapFileInput) return this.mapFileInput;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,.txt";
    input.style.display = "none";
    input.addEventListener("change", async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        await this.handleMapFile(file);
        target.value = "";
      }
    });
    document.body.appendChild(input);
    this.mapFileInput = input;
    return input;
  }

  private async handleMapFile(file: File) {
    try {
      const mapData = await this.mapAdapter.parseFile(file);
      this.gameManager.setMapData(mapData);
      if (this.mapStatusText)
        this.mapStatusText.setText(`已載入地圖：${file.name}`);
    } catch (err) {
      if (this.mapStatusText)
        this.mapStatusText.setText(
          `載入失敗：${err instanceof Error ? err.message : "未知錯誤"}`
        );
    }
  }

  private createHUD() {
    const { width } = this.cameras.main;
    const hudDepth = 150;

    this.scoreText = this.add
      .text(16, 16, "", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "24px",
        backgroundColor: "#00000088",
      })
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.healthBarGraphics = this.add
      .graphics({ x: 16, y: 55 })
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.levelText = this.add
      .text(16, 85, "", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "20px",
        backgroundColor: "#00000088",
      })
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.xpBarGraphics = this.add
      .graphics({ x: 16, y: 115 })
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.weaponNameText = this.add
      .text(width - 15, 16, "🏹 弓", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "20px",
        backgroundColor: "#00000088",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(hudDepth);
  }

  private createPauseText() {
    const { centerX, centerY } = this.cameras.main;
    this.pauseText = this.add
      .text(centerX, centerY, "遊戲暫停 (ESC/P)", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "60px",
        backgroundColor: "#000000aa",
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private createDeathMenu() {
    const { centerX, centerY } = this.cameras.main;
    const bg = this.add.rectangle(0, 0, 450, 350, 0x000000, 0.8);
    const title = this.add
      .text(0, -100, "遊戲結束", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "64px",
        color: "#ff0000",
      })
      .setOrigin(0.5);
    const score = this.add
      .text(0, 0, "", { ...GLOBAL_TEXT_STYLE, fontSize: "36px" })
      .setOrigin(0.5);
    const btn = this.add
      .text(0, 100, "重新開始", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "36px",
        backgroundColor: "#4caf50",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.restartGame());

    this.deathMenuContainer = this.add
      .container(centerX, centerY, [bg, title, score, btn])
      .setDepth(250)
      .setScrollFactor(0)
      .setVisible(false);
    this.deathMenuContainer.setData("scoreText", score);
  }

  private showDeathMenu() {
    const scoreText = this.deathMenuContainer.getData(
      "scoreText"
    ) as Phaser.GameObjects.Text;
    scoreText.setText(`最終得分: ${this.currentScore}`);
    this.deathMenuContainer.setVisible(true);
    this.setHUDVisibility(false);
  }

  private restartGame() {
    this.deathMenuContainer.setVisible(false);
    this.scene.stop("GameScene");
    this.scene.start("GameScene");

    // [System Pause] 重新開始時也需要暫停，直到玩家點選主選單
    this.createMainMenu();
  }

  private updateHUD(data: any) {
    const { health, maxHealth, score, xp, xpToNextLevel, level } = data;
    if (score !== undefined) this.currentScore = score;
    if (health !== undefined) this.currentHealth = health;
    if (maxHealth !== undefined) this.currentMaxHealth = maxHealth;
    if (level !== undefined) this.currentLevel = level;
    if (xp !== undefined) this.currentXp = xp;
    if (xpToNextLevel !== undefined) this.currentXpToNextLevel = xpToNextLevel;

    this.scoreText.setText(
      `得分: ${this.currentScore} | HP: ${this.currentHealth}/${this.currentMaxHealth}`
    );
    this.levelText.setText(
      `等級: ${this.currentLevel} | XP: ${this.currentXp}/${this.currentXpToNextLevel}`
    );
    this.drawHealthBar();
    this.drawXpBar();
  }

  private drawHealthBar() {
    this.healthBarGraphics.clear();
    const barWidth = 200,
      barHeight = 20;
    this.healthBarGraphics.fillStyle(0x555555);
    this.healthBarGraphics.fillRect(0, 0, barWidth, barHeight);
    const ratio = Math.max(
      0,
      Math.min(1, this.currentHealth / this.currentMaxHealth)
    );
    const color = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffa500 : 0xff0000;
    this.healthBarGraphics.fillStyle(color);
    this.healthBarGraphics.fillRect(0, 0, ratio * barWidth, barHeight);
  }

  private drawXpBar() {
    this.xpBarGraphics.clear();
    const barWidth = 200,
      barHeight = 10;
    this.xpBarGraphics.fillStyle(0x333333);
    this.xpBarGraphics.fillRect(0, 0, barWidth, barHeight);
    const ratio =
      this.currentXpToNextLevel > 0
        ? Math.max(0, Math.min(1, this.currentXp / this.currentXpToNextLevel))
        : 0;
    this.xpBarGraphics.fillStyle(0xffd700);
    this.xpBarGraphics.fillRect(0, 0, ratio * barWidth, barHeight);
  }

  /**
   * 處理暫停狀態改變事件
   */
  private handlePauseChange(data: {
    isPaused: boolean;
    isUserPaused: boolean;
  }) {
    // 只有在是「玩家主動暫停」的情況下，才顯示 PAUSED 文字
    // 並且如果升級選單開著，絕對不顯示 PAUSED 文字 (防呆)
    const showText = data.isUserPaused && !this.upgradeMenuContainer.visible;

    this.pauseText.setVisible(showText);

    // 當暫停時隱藏 HUD (可選，看你喜好)，這裡我們選擇:
    // 如果是玩家暫停 -> 隱藏 HUD
    // 如果是系統暫停 (如升級) -> 升級邏輯會自己處理 HUD
    if (data.isUserPaused) {
      this.setHUDVisibility(false);
    } else if (!data.isPaused) {
      // 遊戲恢復，顯示 HUD
      this.setHUDVisibility(true);
    }
  }

  private updateWeaponDisplay(data: { key: string; name: string }) {
    if (this.weaponNameText) this.weaponNameText.setText(`${data.name}`);
  }

  private setHUDVisibility(visible: boolean) {
    this.scoreText.setVisible(visible);
    this.healthBarGraphics.setVisible(visible);
    this.weaponNameText.setVisible(visible);
    this.levelText.setVisible(visible);
    this.xpBarGraphics.setVisible(visible);
  }

  private createUpgradeMenu() {
    const { centerX, centerY } = this.cameras.main;
    const title = this.add
      .text(0, -250, "等級提升！選擇一個加成", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "48px",
        color: "#ffd700",
        backgroundColor: "#000000aa",
      })
      .setOrigin(0.5);
    this.upgradeMenuContainer = this.add
      .container(centerX, centerY, [title])
      .setDepth(300)
      .setScrollFactor(0)
      .setVisible(false);
  }

  /** * 顯示升級選擇界面 (加入轉場動畫邏輯)
   */
  private showUpgradeMenu() {
    if (!this.player) return;

    // 1. [關鍵] 初始鎖定輸入，防止誤觸
    this.canSelectUpgrade = false;

    // 2. 設置背景變暗
    this.cameras.main.setBackgroundColor("rgba(0, 0, 0, 0.7)");
    const gameScene = this.scene.get("GameScene");
    if (gameScene)
      gameScene.cameras.main.setBackgroundColor("rgba(0, 0, 0, 0.7)");

    // 3. 清理舊選項 (保持原邏輯)
    const children = this.upgradeMenuContainer.list;
    while (children.length > 1) {
      const child = children[children.length - 1];
      if (child instanceof Phaser.GameObjects.GameObject) child.destroy();
      children.pop();
    }

    // 4. 生成新選項 (保持原邏輯，這裡簡化演示)
    const upgrades = [
      { Class: HealthBoostDecorator, desc: "❤️ 最大血量 +10~30" },
      { Class: HealingDecorator, desc: "✨ 立即恢復 HP +10~50" },
      { Class: DamageBoostDecorator, desc: "⚔️ 攻擊傷害 +5" },
      { Class: SpeedBoostDecorator, desc: "👟 移動速度 +20" },
    ];
    const selected = Phaser.Utils.Array.Shuffle(upgrades).slice(0, 3);
    const offsets = [-200, 0, 200];
    selected.forEach((u, i) =>
      this.createUpgradeOption(offsets[i], 0, u.desc, u.Class)
    );

    // --- 新增：轉場動畫邏輯 ---

    // A. 初始隱藏選單容器 (設為透明 + 縮小，製作彈出感)
    this.upgradeMenuContainer.setAlpha(0);
    this.upgradeMenuContainer.setScale(0.5);
    this.upgradeMenuContainer.setVisible(true);

    const { centerX, centerY } = this.cameras.main;

    // B. 建立一個暫時的 "LEVEL UP!" 特效文字
    const levelUpText = this.add
      .text(centerX, centerY, "LEVEL UP!", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "96px",
        color: "#ffff00",
        stroke: "#ff0000",
        strokeThickness: 8,
        shadow: { blur: 10, color: "#ff0000", fill: true },
      })
      .setOrigin(0.5)
      .setScale(0)
      .setDepth(400); // 比選單還高層

    // C. 播放動畫序列
    // 階段一： "LEVEL UP!" 彈出
    this.tweens.add({
      targets: levelUpText,
      scale: 1.2,
      duration: 50,
      ease: "Back.out",
      onComplete: () => {
        // 階段二：停留一下後消失，並顯示選單
        this.tweens.add({
          targets: levelUpText,
          alpha: 0,
          scale: 2, // 變大並消失
          duration: 100,
          delay: 300, // [緩衝時間] 這裡控制玩家要等多久
          onComplete: () => {
            levelUpText.destroy(); // 銷毀文字

            // 階段三：選單淡入
            this.tweens.add({
              targets: this.upgradeMenuContainer,
              alpha: 1,
              scale: 1,
              duration: 50,
              ease: "Power2",
              onComplete: () => {
                // [關鍵] 動畫全部結束，才允許玩家選擇
                this.canSelectUpgrade = true;
              },
            });
          },
        });
      },
    });
  }

  /** * 創建升級選項 (加入點擊檢查)
   */
  private createUpgradeOption(x: number, y: number, desc: string, Cls: any) {
    const box = this.add
      .rectangle(x, y, 180, 180, 0x333333)
      .setStrokeStyle(4, 0xffd700)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, desc, {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "20px",
        wordWrap: { width: 160 },
        align: "center",
      })
      .setOrigin(0.5);
    this.upgradeMenuContainer.add([box, text]);

    box.on("pointerdown", () => {
      // [新增] 檢查旗標：如果還在播放動畫，直接忽略點擊
      if (!this.canSelectUpgrade) return;

      if (this.player) {
        new Cls(this.player).apply();
        this.closeUpgradeMenu();
      }
    });

    // 滑鼠懸停效果也可以加個判斷 (可選)
    box.on("pointerover", () => {
      if (this.canSelectUpgrade) box.setFillStyle(0x555555);
    });
    box.on("pointerout", () => {
      if (this.canSelectUpgrade) box.setFillStyle(0x333333);
    });
  }

  private closeUpgradeMenu() {
    this.upgradeMenuContainer.setVisible(false);
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    const gameScene = this.scene.get("GameScene");
    if (gameScene) gameScene.cameras.main.setBackgroundColor("#4488AA");

    this.setHUDVisibility(true);

    // [System Pause] 解除升級暫停
    this.gameManager.setSystemPause("level-up", false);
  }
}
