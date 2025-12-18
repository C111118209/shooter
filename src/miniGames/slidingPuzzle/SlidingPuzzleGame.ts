import { PuzzleBoard } from "./PuzzleBoard";
import { CommandHistory } from "./commands/CommandHistory";
import { MoveTileCommand } from "./commands/MoveTileCommand";
import { PuzzleGenerator } from "./PuzzleGenerator";

export abstract class SlidingPuzzleGame {
  public board!: PuzzleBoard;
  public history = new CommandHistory();
  public isGameOver = false;

  // 外部調用啟動
  start(size: number) {
    this.board = PuzzleGenerator.generate(size);
    this.history.clear();
    this.isGameOver = false;
    this.onStart();
  }

  // 玩家嘗試點擊某個 Tile
  tryMove(tileIndex: number) {
    if (this.isGameOver || !this.canMove()) return;

    const empty = this.board.emptyIndex;
    const validMoves = this.board.getValidMoves();

    if (validMoves.includes(tileIndex)) {
      const cmd = new MoveTileCommand(this.board, tileIndex, empty);
      this.history.execute(cmd);

      this.afterMove();

      if (this.board.isSolved()) {
        this.isGameOver = true;
        this.onWin();
      }
    }
  }

  undo() {
    if (this.isGameOver) return;
    this.history.undo();
  }

  // 模板方法：交給子類實作規則
  protected abstract onStart(): void;
  protected abstract canMove(): boolean;
  protected abstract afterMove(): void;
  protected abstract onWin(): void;
}
