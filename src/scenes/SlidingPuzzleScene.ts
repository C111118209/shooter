import Phaser from "phaser";
import GameScene, { GLOBAL_TEXT_STYLE } from "./GameScene";
import { TimedMode } from "../miniGames/slidingPuzzle/modes/TimedMode";
import { SlidingPuzzleGame } from "../miniGames/slidingPuzzle/SlidingPuzzleGame";
import { GameManager } from "../core/GameManager";

type PuzzleConfig = {
  label: string;
  size: number;
  timeLimit: number | null; // null = 無限時間
  rewardHealth: number; // 對應此難度的獎勵血量
};

export default class SlidingPuzzleScene extends Phaser.Scene {
  private gameLogic!: SlidingPuzzleGame;
  private tileButtons: Phaser.GameObjects.Container[] = [];
  private infoText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private boardContainer!: Phaser.GameObjects.Container;

  // Constants
  private readonly TILE_SIZE = 100;
  private readonly BOARD_PADDING = 10;

  // 模式設定（Template Method + 不同配置）
  private readonly CONFIGS: PuzzleConfig[] = [
    // 難度越高 rewardHealth 越多
    { label: "3x3 / 無限", size: 3, timeLimit: null, rewardHealth: 40 },
    { label: "3x3 / 60s", size: 3, timeLimit: 60, rewardHealth: 60 },
    // { label: "4x4 / 無限", size: 4, timeLimit: null, rewardHealth: 80 },
    // { label: "4x4 / 240s", size: 4, timeLimit: 240, rewardHealth: 100 },
  ];
  private currentConfig: PuzzleConfig = this.CONFIGS[0];

  // State
  private timeLeft: number = 60;
  private timerEvent?: Phaser.Time.TimerEvent;
  private initialTiles: number[] = []; // [New] 用於儲存初始盤面

  constructor() {
    super("SlidingPuzzleScene");
  }

  create() {
    const { centerX, centerY } = this.cameras.main;

    // 背景
    this.add.rectangle(
      centerX,
      centerY,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7
    );

    // 標題
    this.add
      .text(centerX, centerY - 260, "滑塊拼圖：恢復地圖核心", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "40px",
        color: "#ffd700",
      })
      .setOrigin(0.5);

    // 時間文字
    this.timerText = this.add
      .text(centerX, centerY - 200, `剩餘時間: ${this.timeLeft}`, {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // 先建立棋盤容器（邊框背景），待會再載入實際盤面
    this.boardContainer = this.add.container(centerX, centerY);
    const totalSize =
      this.currentConfig.size * this.TILE_SIZE + this.BOARD_PADDING * 2;
    const bg = this.add
      .rectangle(0, 0, totalSize, totalSize, 0x333333)
      .setStrokeStyle(4, 0xffffff);
    this.boardContainer.add(bg);

    // 資訊文字
    this.infoText = this.add
      .text(centerX, centerY + 220, "", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "24px",
      })
      .setOrigin(0.5);

    this.createControls();

    // [New] 初始化鍵盤輸入 (WASD / Arrows)
    this.initKeyboardControls();

    // 最後再初始化遊戲邏輯與盤面，這時候 UI 元件都已經存在
    this.initGame();
  }

  // [New] 首次初始化：根據目前配置產生隨機盤面並存檔
  private initGame() {
    // 開場隨機選一個 PuzzleConfig，不讓玩家自己選
    const randomIndex = Math.floor(Math.random() * this.CONFIGS.length);
    const randomConfig = this.CONFIGS[randomIndex];
    this.applyConfig(randomConfig);
  }

  // 根據指定配置啟動一盤新遊戲
  private applyConfig(config: PuzzleConfig) {
    this.currentConfig = config;

    // 建立邏輯（Template Method 子類：TimedMode）
    this.gameLogic = new TimedMode();
    this.gameLogic.start(this.currentConfig.size);

    // 深拷貝保存初始盤面狀態，用於重置
    this.initialTiles = [...this.gameLogic.board.tiles];

    // 計時設定：有時間限制才開啟計時器
    if (this.timerEvent) this.timerEvent.remove();
    if (this.currentConfig.timeLimit != null) {
      this.startTimer();
    } else {
      this.timerEvent = undefined;
      this.timeLeft = 0;
      this.timerText.setText("剩餘時間: ∞");
      this.timerText.setColor("#ffffff");
    }

    this.renderBoard();
    this.updateUI();
    this.infoText.setColor("#ffffff");
  }

  // [New] 重置遊戲：回到初始版面，但「不重置時間」
  private resetGame() {
    // 重新建立邏輯實例，回到最初盤面
    this.gameLogic = new TimedMode();
    this.gameLogic.start(this.currentConfig.size);
    this.gameLogic.board.tiles = [...this.initialTiles];
    this.gameLogic.history.clear();
    this.gameLogic.isGameOver = false;

    this.renderBoard();
    this.updateUI();
    this.infoText.setColor("#ffffff");
  }

  private startTimer() {
    this.timeLeft = this.currentConfig.timeLimit ?? 0;
    if (this.timerEvent) this.timerEvent.remove();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onSecondPassed,
      callbackScope: this,
      loop: true,
    });
  }

  private onSecondPassed() {
    if (this.gameLogic.isGameOver) return;

    this.timeLeft--;
    this.updateUI();

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.handleGameOver("時間耗盡！");
      this.quitGame();
    }
  }

  private handleGameOver(reason: string) {
    this.gameLogic.isGameOver = true;
    if (this.timerEvent) this.timerEvent.remove();
    this.infoText.setText(reason);
    this.infoText.setColor("#ff0000");
  }

  // 高光判斷邏輯
  private canMove(index: number): boolean {
    if (this.gameLogic.isGameOver) return false;

    const tiles = this.gameLogic.board.tiles;
    const emptyIndex = tiles.indexOf(0);

    const row = Math.floor(index / this.currentConfig.size);
    const col = index % this.currentConfig.size;
    const emptyRow = Math.floor(emptyIndex / this.currentConfig.size);
    const emptyCol = emptyIndex % this.currentConfig.size;

    return Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;
  }

  private renderBoard() {
    this.tileButtons.forEach((tile) => tile.destroy());
    this.tileButtons = [];
    const startX =
      -((this.currentConfig.size * this.TILE_SIZE) / 2) + this.TILE_SIZE / 2;
    const startY =
      -((this.currentConfig.size * this.TILE_SIZE) / 2) + this.TILE_SIZE / 2;

    this.gameLogic.board.tiles.forEach((tileValue, index) => {
      if (tileValue === 0) return;
      const row = Math.floor(index / this.currentConfig.size);
      const col = index % this.currentConfig.size;
      const x = startX + col * this.TILE_SIZE;
      const y = startY + row * this.TILE_SIZE;

      const tileContainer = this.add.container(x, y);

      const box = this.add
        .rectangle(0, 0, this.TILE_SIZE - 5, this.TILE_SIZE - 5, 0x1e90ff)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.handleTileClick(index))
        .on("pointerover", () => {
          if (this.canMove(index)) {
            box.setFillStyle(0x00bfff);
            this.input.setDefaultCursor("pointer");
          } else {
            this.input.setDefaultCursor("default");
          }
        })
        .on("pointerout", () => {
          box.setFillStyle(0x1e90ff);
          this.input.setDefaultCursor("default");
        });

      const txt = this.add
        .text(0, 0, tileValue.toString(), {
          ...GLOBAL_TEXT_STYLE,
          fontSize: "32px",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      tileContainer.add([box, txt]);
      this.boardContainer.add(tileContainer);
      this.tileButtons.push(tileContainer);
    });
  }

  private handleTileClick(index: number) {
    if (this.gameLogic.isGameOver) return;

    this.gameLogic.tryMove(index);
    this.renderBoard();
    this.updateUI();

    if (this.gameLogic.isGameOver && this.gameLogic.board.isSolved()) {
      this.handleWin();
    }
  }

  // [New] 處理鍵盤移動邏輯
  private handleKeyboardMove(direction: "UP" | "DOWN" | "LEFT" | "RIGHT") {
    if (this.gameLogic.isGameOver) return;

    const tiles = this.gameLogic.board.tiles;
    const emptyIndex = tiles.indexOf(0);
    const size = this.currentConfig.size;
    const emptyRow = Math.floor(emptyIndex / size);
    const emptyCol = emptyIndex % size;

    let targetIndex = -1;

    // 邏輯說明：
    // 按「上」鍵 -> 希望方塊往上跑 -> 要點擊空白格「下方」的方塊
    // 按「左」鍵 -> 希望方塊往左跑 -> 要點擊空白格「右方」的方塊
    switch (direction) {
      case "UP":
        // 如果空白格不是在最下面一行，那它下面才有方塊可以往上移
        if (emptyRow < size - 1) targetIndex = emptyIndex + size;
        break;
      case "DOWN":
        // 如果空白格不是在最上面一行，那它上面才有方塊可以往下移
        if (emptyRow > 0) targetIndex = emptyIndex - size;
        break;
      case "LEFT":
        // 如果空白格不是在最右邊，那它右邊才有方塊可以往左移
        if (emptyCol < size - 1) targetIndex = emptyIndex + 1;
        break;
      case "RIGHT":
        // 如果空白格不是在最左邊，那它左邊才有方塊可以往右移
        if (emptyCol > 0) targetIndex = emptyIndex - 1;
        break;
    }

    if (targetIndex !== -1) {
      this.handleTileClick(targetIndex);
    }
  }

  // [New] 初始化鍵盤監聽
  private initKeyboardControls() {
    if (!this.input.keyboard) return;

    // 為了避免重複綁定，先移除舊的監聽 (雖然 create 只會執行一次，但保險起見)
    this.input.keyboard.removeAllListeners("keydown-W");
    this.input.keyboard.removeAllListeners("keydown-S");
    this.input.keyboard.removeAllListeners("keydown-A");
    this.input.keyboard.removeAllListeners("keydown-D");
    this.input.keyboard.removeAllListeners("keydown-UP");
    this.input.keyboard.removeAllListeners("keydown-DOWN");
    this.input.keyboard.removeAllListeners("keydown-LEFT");
    this.input.keyboard.removeAllListeners("keydown-RIGHT");

    // 定義移動函式
    const moveUp = () => this.handleKeyboardMove("UP");
    const moveDown = () => this.handleKeyboardMove("DOWN");
    const moveLeft = () => this.handleKeyboardMove("LEFT");
    const moveRight = () => this.handleKeyboardMove("RIGHT");

    // 綁定 WASD
    this.input.keyboard.on("keydown-W", moveUp);
    this.input.keyboard.on("keydown-S", moveDown);
    this.input.keyboard.on("keydown-A", moveLeft);
    this.input.keyboard.on("keydown-D", moveRight);

    // 綁定方向鍵
    this.input.keyboard.on("keydown-UP", moveUp);
    this.input.keyboard.on("keydown-DOWN", moveDown);
    this.input.keyboard.on("keydown-LEFT", moveLeft);
    this.input.keyboard.on("keydown-RIGHT", moveRight);
  }

  private updateUI() {
    const stepsUsed = this.gameLogic.history.count;

    this.infoText.setText(
      `模式: ${this.currentConfig.label} | 步數: ${stepsUsed}`
    );
    this.infoText.setColor("#ffffff");

    if (this.currentConfig.timeLimit != null) {
      this.timerText.setText(`剩餘時間: ${this.timeLeft}s`);
      if (this.timeLeft <= 10) {
        this.timerText.setColor("#ff0000");
      } else {
        this.timerText.setColor("#ffffff");
      }
    } else {
      this.timerText.setText("剩餘時間: ∞");
      this.timerText.setColor("#ffffff");
    }
  }

  private createControls() {
    const { centerX, centerY } = this.cameras.main;
    const buttonY = centerY + 280;

    // 上一步
    this.add
      .text(centerX - 150, buttonY, "↩ 上一步", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "24px",
        backgroundColor: "#666666",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.gameLogic.undo();
        this.renderBoard();
        this.updateUI();
      });

    // 重置按鈕
    this.add
      .text(centerX, buttonY, "🔄 重置", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "24px",
        backgroundColor: "#4444aa",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.resetGame();
      });

    // 放棄
    this.add
      .text(centerX + 150, buttonY, "❌ 放棄", {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "24px",
        backgroundColor: "#8b0000",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.quitGame());
  }

  private quitGame() {
    // 移除鍵盤監聽，避免回到主遊戲後誤觸
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners("keydown-W");
      this.input.keyboard.removeAllListeners("keydown-S");
      this.input.keyboard.removeAllListeners("keydown-A");
      this.input.keyboard.removeAllListeners("keydown-D");
      this.input.keyboard.removeAllListeners("keydown-UP");
      this.input.keyboard.removeAllListeners("keydown-DOWN");
      this.input.keyboard.removeAllListeners("keydown-LEFT");
      this.input.keyboard.removeAllListeners("keydown-RIGHT");
    }

    if (this.timerEvent) this.timerEvent.remove();
    this.scene.stop();
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");
    GameManager.getInstance().setSystemPause("mini-game", false);
  }

  private handleWin() {
    if (this.timerEvent) this.timerEvent.remove();

    this.infoText.setText("🎉 核心修復完成！");
    this.infoText.setColor("#00ff00");

    this.time.delayedCall(1500, () => {
      const gameScene = this.scene.get("GameScene") as GameScene;
      if (gameScene && gameScene.playerObj) {
        const player = gameScene.playerObj;
        const reward = this.currentConfig.rewardHealth;
        if (player.health >= player.maxHealth) {
          // 血已滿：增加上限，同時回滿
          player.maxHealth += reward;
          player.health = player.maxHealth;
        } else {
          // 血未滿：直接回復，但不超過上限
          player.health = Math.min(player.maxHealth, player.health + reward);
        }
      }
      this.quitGame();
    });
  }
}