export class PuzzleBoard {
  public tiles: number[];
  public size: number;

  constructor(size: number, tiles?: number[]) {
    this.size = size;
    // 如果沒傳入 tiles，預設生成一個完成狀態 [1, 2, 3, ..., 0]
    this.tiles =
      tiles ||
      Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
  }

  get emptyIndex(): number {
    return this.tiles.indexOf(0);
  }

  swap(indexA: number, indexB: number) {
    [this.tiles[indexA], this.tiles[indexB]] = [
      this.tiles[indexB],
      this.tiles[indexA],
    ];
  }

  // 取得指定索引周圍可以移動到空格的合法索引
  getValidMoves(): number[] {
    const moves: number[] = [];
    const empty = this.emptyIndex;
    const row = Math.floor(empty / this.size);
    const col = empty % this.size;

    if (row > 0) moves.push(empty - this.size); // 上
    if (row < this.size - 1) moves.push(empty + this.size); // 下
    if (col > 0) moves.push(empty - 1); // 左
    if (col < this.size - 1) moves.push(empty + 1); // 右

    return moves;
  }

  isSolved(): boolean {
    for (let i = 0; i < this.tiles.length - 1; i++) {
      if (this.tiles[i] !== i + 1) return false;
    }
    return this.tiles[this.tiles.length - 1] === 0;
  }

  clone(): PuzzleBoard {
    return new PuzzleBoard(this.size, [...this.tiles]);
  }
}
