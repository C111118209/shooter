import { SlidingPuzzleGame } from "../SlidingPuzzleGame";

/**
 * 純「限時」模式：
 * - 不限制步數
 * - 步數只作為統計顯示
 * - 失敗條件由外部（Scene 的倒數計時）決定
 */
export class TimedMode extends SlidingPuzzleGame {
  protected onStart(): void {
    // 可以在這裡做一些初始化提示或統計重置
  }

  protected canMove(): boolean {
    // 不限制步數，由外部時間控制遊戲結束
    return true;
  }

  protected afterMove(): void {
    // 這裡可以做每一步之後的統計或音效
  }

  protected onWin(): void {
    // 真正的過關處理由外部 Scene 負責
  }

  /** 目前已使用步數（給 UI 顯示用） */
  get stepsUsed(): number {
    return this.history.count;
  }
}


