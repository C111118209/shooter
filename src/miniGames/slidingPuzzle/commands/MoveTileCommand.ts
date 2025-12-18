import { type Command } from "./Command";
import { PuzzleBoard } from "../PuzzleBoard";

export class MoveTileCommand implements Command {
  private board: PuzzleBoard;
  private fromIndex: number;
  private toIndex: number;

  constructor(board: PuzzleBoard, fromIndex: number, toIndex: number) {
    this.board = board;
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
  }

  execute() {
    this.board.swap(this.fromIndex, this.toIndex);
  }

  undo() {
    // 交換回來即是撤銷
    this.board.swap(this.toIndex, this.fromIndex);
  }
}
