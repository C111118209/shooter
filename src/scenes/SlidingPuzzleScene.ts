import Phaser from "phaser";
import { GLOBAL_TEXT_STYLE } from "./GameScene";
import { StepLimitMode } from "../miniGames/slidingPuzzle/modes/StepLimitMode";
import { SlidingPuzzleGame } from "../miniGames/slidingPuzzle/SlidingPuzzleGame";

/**
 * 滑塊拼圖小遊戲場景
 * 負責渲染 PuzzleBoard 並處理使用者輸入
 */
export default class SlidingPuzzleScene extends Phaser.Scene {
  private gameLogic!: SlidingPuzzleGame;
  private tileButtons: Phaser.GameObjects.Container[] = [];
  private infoText!: Phaser.GameObjects.Text;
  private boardContainer!: Phaser.GameObjects.Container;

  private readonly TILE_SIZE = 100;
  private readonly GRID_SIZE = 3; // 3x3
  private readonly BOARD_PADDING = 10;

  constructor() {
    super("SlidingPuzzleScene");
  }

  create() {
    const { centerX, centerY } = this.cameras.main;

    // 1. 初始化遊戲邏輯 (範例：使用 50 步限制模式)
    this.gameLogic = new StepLimitMode(50);
    this.gameLogic.start(this.GRID_SIZE);

    // 2. 建立背景遮罩 (半透明背景)
    this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x000000, 0.7);

    // 3. 建立標題
    this.add.text(centerX, centerY - 250, "滑塊拼圖：恢復地圖核心", {
      ...GLOBAL_TEXT_STYLE,
      fontSize: "40px",
      color: "#ffd700"
    }).setOrigin(0.5);

    // 4. 建立棋盤容器
    this.boardContainer = this.add.container(centerX, centerY);
    
    // 建立棋盤底盤
    const totalSize = this.GRID_SIZE * this.TILE_SIZE + this.BOARD_PADDING * 2;
    const bg = this.add.rectangle(0, 0, totalSize, totalSize, 0x333333).setStrokeStyle(4, 0xffffff);
    this.boardContainer.add(bg);

    // 5. 建立資訊文字 (步數顯示)
    this.infoText = this.add.text(centerX, centerY + 220, "", {
      ...GLOBAL_TEXT_STYLE,
      fontSize: "24px"
    }).setOrigin(0.5);

    // 6. 建立功能按鈕 (離開 / 撤銷)
    this.createControls();

    // 7. 渲染拼圖
    this.renderBoard();
    this.updateUI();
  }

  /**
   * 根據邏輯層的 tiles 數據渲染畫面
   */
  private renderBoard() {
    // 清理舊的 tiles
    this.tileButtons.forEach(tile => tile.destroy());
    this.tileButtons = [];

    const startX = -((this.GRID_SIZE * this.TILE_SIZE) / 2) + this.TILE_SIZE / 2;
    const startY = -((this.GRID_SIZE * this.TILE_SIZE) / 2) + this.TILE_SIZE / 2;

    this.gameLogic.board.tiles.forEach((tileValue, index) => {
      if (tileValue === 0) return; // 0 是空格，不渲染

      const row = Math.floor(index / this.GRID_SIZE);
      const col = index % this.GRID_SIZE;

      const x = startX + col * this.TILE_SIZE;
      const y = startY + row * this.TILE_SIZE;

      // 建立方塊容器
      const tileContainer = this.add.container(x, y);
      
      const box = this.add.rectangle(0, 0, this.TILE_SIZE - 5, this.TILE_SIZE - 5, 0x1e90ff)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.handleTileClick(index))
        .on("pointerover", () => box.setFillStyle(0x00bfff))
        .on("pointerout", () => box.setFillStyle(0x1e90ff));

      const txt = this.add.text(0, 0, tileValue.toString(), {
        ...GLOBAL_TEXT_STYLE,
        fontSize: "32px",
        fontStyle: "bold"
      }).setOrigin(0.5);

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

  private updateUI() {
    const steps = (this.gameLogic as StepLimitMode).remainingSteps;
    this.infoText.setText(`剩餘步數: ${steps} / 已使用: ${this.gameLogic.history.count}`);
    
    if (steps <= 0 && !this.gameLogic.board.isSolved()) {
        this.infoText.setText("步數用盡！點擊右側重新開始");
        this.infoText.setColor("#ff0000");
    }
  }

  private createControls() {
    const { centerX, centerY, width } = this.cameras.main;

    // 撤銷按鈕 (Undo)
    const undoBtn = this.add.text(centerX - 100, centerY + 280, "↩ 上一步", {
      ...GLOBAL_TEXT_STYLE,
      fontSize: "24px",
      backgroundColor: "#666666"
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      this.gameLogic.undo();
      this.renderBoard();
      this.updateUI();
    });

    // 離開按鈕
    const closeBtn = this.add.text(centerX + 100, centerY + 280, "❌ 關閉", {
      ...GLOBAL_TEXT_STYLE,
      fontSize: "24px",
      backgroundColor: "#8b0000"
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      this.scene.stop();
      this.scene.resume("GameScene");
      this.scene.resume("UIScene");
    });
  }

  private handleWin() {
    this.infoText.setText("🎉 核心修復完成！");
    this.infoText.setColor("#00ff00");

    // 3秒後自動關閉並給予獎勵（範例）
    this.time.delayedCall(2000, () => {
      const gameManager = (this.scene.get("UIScene") as any).gameManager;
      // 假設可以透過單例給玩家加分
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}