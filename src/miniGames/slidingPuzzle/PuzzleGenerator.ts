import { PuzzleBoard } from "./PuzzleBoard";

export class PuzzleGenerator {
    static generate(size: number, shuffleSteps: number = 100): PuzzleBoard {
        const board = new PuzzleBoard(size); // 初始為完成狀態

        // 透過反向隨機移動來打亂，保證必有解
        for (let i = 0; i < shuffleSteps; i++) {
            const moves = board.getValidMoves();
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            board.swap(randomMove, board.emptyIndex);
        }

        return board;
    }
}