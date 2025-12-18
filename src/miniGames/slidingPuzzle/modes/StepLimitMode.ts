import { SlidingPuzzleGame } from "../SlidingPuzzleGame";

export class StepLimitMode extends SlidingPuzzleGame {
  private maxSteps: number;
  get limit(): number {
    return this.maxSteps;
  }

  constructor(maxSteps: number) {
    super();
    this.maxSteps = maxSteps;
  }

  get remainingSteps(): number {
    return this.maxSteps - this.history.count;
  }

  protected onStart() {
    // console.log(`步數限制模式開始！上限: ${this.maxSteps}`);
  }

  protected canMove(): boolean {
    return this.history.count < this.maxSteps;
  }

  protected afterMove() {
    // console.log(`剩餘步數: ${this.remainingSteps}`);
    // if (this.remainingSteps <= 0 && !this.board.isSolved()) {
    //   this.isGameOver = true;
    //   // console.log("步數用盡，遊戲失敗");
    // }
  }

  protected onWin() {
    // console.log("恭喜在限制步數內完成！");
  }
}
