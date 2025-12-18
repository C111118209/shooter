import Phaser from "phaser";
import type { MapData } from "../maps/MapTypes";

export interface GameEvents {
  "game-started": () => void;
  // 參數變更：傳遞當前是否暫停，以及是否是玩家觸發的
  "pause-changed": (data: { isPaused: boolean; isUserPaused: boolean }) => void;
  "player-die": () => void;
  "player-level-up": (data?: {
    level: number;
    maxHealth: number;
    attackDamage: number;
  }) => void;
  "update-stats": (data: any) => void;
  "weapon-change": (data: { key: string; name: string }) => void;
}

export class GameManager extends Phaser.Events.EventEmitter {
  private static instance: GameManager | null = null;
  private gameScene: Phaser.Scene | null = null;
  private uiScene: Phaser.Scene | null = null;
  private slidingPuzzleScene: Phaser.Scene | null = null;

  // --- 新的暫停狀態管理 ---
  private _isUserPaused: boolean = false;
  private _systemPauseReasons: Set<string> = new Set();
  // -----------------------

  private score: number = 0;
  private resizeHandler: (() => void) | null = null;
  private mapData: MapData | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) GameManager.instance = new GameManager();
    return GameManager.instance;
  }

  public initialize(
    gameScene: Phaser.Scene,
    uiScene: Phaser.Scene,
    slidingPuzzleScene: Phaser.Scene
  ): void {
    this.gameScene = gameScene;
    this.uiScene = uiScene;
    this.slidingPuzzleScene = slidingPuzzleScene;
    this.setupResizeHandler();
  }

  // --- 核心暫停邏輯 ---

  /**
   * 取得「最終」暫停狀態
   * 只要有玩家暫停 OR 任何系統暫停，遊戲就是暫停的
   */
  public get isPaused(): boolean {
    return this._isUserPaused || this._systemPauseReasons.size > 0;
  }

  public get isUserPaused(): boolean {
    return this._isUserPaused;
  }

  public get isSystemPaused(): boolean {
    return this._systemPauseReasons.size > 0;
  }

  /**
   * 切換玩家暫停 (ESC/P)
   * 如果系統正在暫停中（例如死亡、升級選單），則忽略玩家的暫停請求
   */
  public toggleUserPause(): void {
    // 如果系統已經鎖定暫停（例如正在玩小遊戲），不允許玩家切換暫停介面
    if (this.isSystemPaused) return;

    this._isUserPaused = !this._isUserPaused;
    this.updatePauseState();
  }

  /**
   * 設定系統暫停
   * @param reason 暫停原因 (例如 'mini-game', 'level-up', 'death', 'main-menu')
   * @param paused 是否暫停
   */
  public setSystemPause(reason: string, paused: boolean): void {
    if (paused) {
      this._systemPauseReasons.add(reason);
    } else {
      this._systemPauseReasons.delete(reason);
    }
    this.updatePauseState();
  }

  /**
   * 內部方法：更新物理引擎並發送事件
   */
  private updatePauseState() {
    const paused = this.isPaused;

    if (this.gameScene) {
      if (paused) {
        this.gameScene.physics.pause();
      } else {
        this.gameScene.physics.resume();
      }
    }

    // 發送事件給 UIScene 更新介面
    this.emit("pause-changed", {
      isPaused: paused,
      isUserPaused: this._isUserPaused,
    });
  }

  // -----------------------

  public setMapData(mapData: MapData): void {
    this.mapData = mapData;
    if (
      this.gameScene &&
      typeof (this.gameScene as any).applyMapData === "function"
    ) {
      (this.gameScene as any).applyMapData(mapData);
    }
  }

  public getMapData(): MapData | null {
    return this.mapData;
  }

  private setupResizeHandler() {
    if (this.resizeHandler)
      window.removeEventListener("resize", this.resizeHandler);
    this.resizeHandler = () => {
      if (!this.gameScene || !this.uiScene) return;
      this.gameScene.scale.refresh();
      const gameSize = this.gameScene.scale.gameSize;
      (this.gameScene as any)?.handleResize?.(gameSize);
      (this.uiScene as any)?.handleResize?.(gameSize);
    };
    window.addEventListener("resize", this.resizeHandler);
  }

  public updateScore(newScore: number): void {
    this.score = newScore;
    this.emit("update-stats", { score: this.score });
  }

  public getScore(): number {
    return this.score;
  }
  public resetScore(): void {
    this.score = 0;
    this.emit("update-stats", { score: this.score });
  }

  public notifyPlayerDeath(): void {
    // 使用系統暫停
    this.setSystemPause("death", true);
    this.emit("player-die");
  }

  public notifyPlayerLevelUp(data?: any): void {
    // 使用系統暫停
    this.setSystemPause("level-up", true);
    this.emit("player-level-up", data);
  }

  public notifyWeaponChange(key: string, name: string): void {
    this.emit("weapon-change", { key, name });
  }

  public notifyGameStarted(): void {
    // 移除主選單的系統暫停
    this.setSystemPause("main-menu", false);
    // 確保玩家暫停也是關閉的
    this._isUserPaused = false;
    this.updatePauseState();
    this.emit("game-started");
  }

  public notifyStatsUpdate(data: any): void {
    this.emit("update-stats", data);
  }

  public getGameScene(): Phaser.Scene | null {
    return this.gameScene;
  }
  public getUIScene(): Phaser.Scene | null {
    return this.uiScene;
  }
  public getSlidingPuzzleScene(): Phaser.Scene | null {
    return this.slidingPuzzleScene;
  }

  public reset(): void {
    this._isUserPaused = false;
    this._systemPauseReasons.clear();
    this.score = 0;
    // 初始狀態可能需要主選單暫停，由 UIScene 呼叫 setSystemPause('main-menu', true) 決定
  }

  public destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    this.removeAllListeners();
    this.gameScene = null;
    this.uiScene = null;
  }
}
