export type PuzzleMode = "FREE" | "TIMED" | "STEP_LIMIT";

export interface PuzzleState {
  tiles: number[];
  size: number;
  emptyIndex: number;
}
