import Phaser from "phaser";
import type { MapData } from "../maps/MapTypes";

/**
 * 遊戲事件類型定義
 */
export interface GameEvents {
  // 遊戲狀態事件
  "game-started": () => void;
  "game-paused": (isPaused: boolean) => void;
  
  // 玩家事件
  "player-die": () => void;
  // "player-level-up": (data?: { level: number; maxHealth: number; attackDamage: number }) => void;
  
  // UI 更新事件
  "update-stats": (data: { score?: number; health?: number; maxHealth?: number; xp?: number; level?: number; xpToNextLevel?: number }) => void;
  "weapon-change": (data: { key: string; name: string }) => void;
}

/**
 * 遊戲管理器單例類
 * 作為中央事件總線，統一管理所有場景間的通訊
 */
export class GameManager extends Phaser.Events.EventEmitter {
  private static instance: GameManager | null = null;
  private gameScene: Phaser.Scene | null = null;
  private uiScene: Phaser.Scene | null = null;
  private isPaused: boolean = true;
  private score: number = 0;
  private resizeHandler: (() => void) | null = null;
  private mapData: MapData | null = null;

  public get paused() {
    return this.isPaused;
  }

  /**
   * 設定地圖資料並通知 GameScene 應用。
   */
  public setMapData(mapData: MapData): void {
    this.mapData = mapData;
    if (this.gameScene && typeof (this.gameScene as any).applyMapData === "function") {
      (this.gameScene as any).applyMapData(mapData);
    }
  }

  public getMapData(): MapData | null {
    return this.mapData;
  }

  private constructor() {
    super();
    // 私有構造函數，防止外部實例化
  }

  /**
   * 獲取 GameManager 單例實例
   */
  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * 初始化 GameManager，註冊場景引用
   */
  public initialize(gameScene: Phaser.Scene, uiScene: Phaser.Scene) {
    this.gameScene = gameScene;
    this.uiScene = uiScene;
    
    // 設置窗口大小變化監聽
    this.setupResizeHandler();
  }

  /**
   * 設置窗口大小變化監聽
   */
  private setupResizeHandler() {
    // 移除舊的監聽器（如果存在）
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }

    // 創建新的 resize 處理函數
    this.resizeHandler = () => {
      if (!this.gameScene || !this.uiScene) return;

      // 強制更新 Scale Manager
      this.gameScene.scale.refresh();
      
      // 獲取當前遊戲大小
      const gameSize = this.gameScene.scale.gameSize;

      // 通知 GameScene 處理 resize
      if (typeof (this.gameScene as any).handleResize === 'function') {
        (this.gameScene as any).handleResize(gameSize);
      }

      // 通知 UIScene 處理 resize
      if (typeof (this.uiScene as any).handleResize === 'function') {
        (this.uiScene as any).handleResize(gameSize);
      }
    };

    // 添加窗口監聽
    window.addEventListener("resize", this.resizeHandler);
  }

  /**
   * 設置遊戲暫停狀態
   */
  public setPause(paused: boolean): void {
    if (this.isPaused === paused) return;

    this.isPaused = paused;

    if (!this.gameScene) return;

    // 更新物理引擎狀態
    if (this.isPaused) {
      this.gameScene.physics.pause();
    } else {
      this.gameScene.physics.resume();
    }

    // 通過事件總線發送暫停狀態事件
    this.emit("game-paused", this.isPaused);
  }

  /**
   * 切換遊戲暫停狀態
   */
  public togglePause(): void {
    this.setPause(!this.isPaused);
  }

  /**
   * 獲取當前暫停狀態
   */
  public getPaused(): boolean {
    return this.isPaused;
  }

  /**
   * 更新分數
   */
  public updateScore(newScore: number): void {
    this.score = newScore;
    this.emit("update-stats", { score: this.score });
  }

  /**
   * 獲取當前分數
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * 重置分數
   */
  public resetScore(): void {
    this.score = 0;
    this.emit("update-stats", { score: this.score });
  }

  /**
   * 發送玩家死亡事件
   */
  public notifyPlayerDeath(): void {
    this.setPause(true);
    this.emit("player-die");
  }

  /**
   * 發送玩家升級事件
   */
  public notifyPlayerLevelUp(data?: { level: number; maxHealth: number; attackDamage: number }): void {
    this.setPause(true);
    this.emit("player-level-up", data);
  }

  /**
   * 發送武器變更事件
   */
  public notifyWeaponChange(key: string, name: string): void {
    this.emit("weapon-change", { key, name });
  }

  /**
   * 發送遊戲開始事件
   */
  public notifyGameStarted(): void {
    this.setPause(false);
    this.emit("game-started");
  }

  /**
   * 發送統計更新事件（用於更新 UI）
   */
  public notifyStatsUpdate(data: { score?: number; health?: number; maxHealth?: number; xp?: number; level?: number; xpToNextLevel?: number }): void {
    this.emit("update-stats", data);
  }

  /**
   * 獲取 GameScene 引用
   */
  public getGameScene(): Phaser.Scene | null {
    return this.gameScene;
  }

  /**
   * 獲取 UIScene 引用
   */
  public getUIScene(): Phaser.Scene | null {
    return this.uiScene;
  }

  /**
   * 重置遊戲狀態
   */
  public reset(): void {
    this.isPaused = true;
    this.score = 0;
    // 清除所有事件監聽器（可選，根據需求決定）
    // this.removeAllListeners();
  }

  /**
   * 銷毀 GameManager（清理資源）
   */
  public destroy(): void {
    // 移除窗口監聽
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    
    this.removeAllListeners();
    this.gameScene = null;
    this.uiScene = null;
  }
}

