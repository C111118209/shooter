# 👾 2D 射擊遊戲：設計模式演示專案規格書 (單前端)

## 目標
創建一個高度註解、使用 TypeScript 結構的單一 HTML 檔案，實現 2D 俯視射擊遊戲核心邏輯，用於軟體設計模式教學演示。

---

## 核心約束
- **單一文件強制**：所有 HTML、CSS (Tailwind)、JavaScript (以 TypeScript 結構撰寫) 必須包含在 `shooter_demo_ts.html` 檔案中。
- **TypeScript 結構**：程式碼使用現代 ES6 Class 與介面 (Interface) 組織，最終輸出為原生 JS，但需遵循嚴格 TS 類型設計。
- **無後端依賴**：移除 Node.js、WebSocket、SQLite、多人體驗邏輯。
- **高可讀性註解**：為所有類別、方法及設計模式應用提供詳細中文註解，說明：
  - 這是什麼模式
  - 為什麼使用
  - 如何實現

---

## 區塊 1：技術棧與環境要求 (Technology Stack)

| 項目       | 技術                 | 說明                                                         |
|------------|--------------------|------------------------------------------------------------|
| 前端       | TypeScript Class Structure | 結構化且易於閱讀，模擬 TS 介面和類型                                 |
| 遊戲渲染   | 原生 Canvas API       | 實現 2D 繪製和遊戲循環                                           |
| UI 樣式    | Tailwind CSS         | 保持美觀與響應性                                               |
| 程式碼品質 | 詳盡中文註解           | 針對設計模式應用提供極為詳細註解                                   |

---

## 區塊 2：遊戲設計與核心邏輯 (Game Design & Logic)
- **遊戲視圖**：2D 俯視視角 (平面設計)，模擬 Minecraft 像素風格。
- **核心交互**：
  - 玩家移動：WASD
  - 玩家射擊：滑鼠點擊
  - 擊殺怪物獲得經驗值
- **單機運行**：僅支援單人體驗。

---

## 區塊 3：設計模式的精確實施 (Design Pattern Implementation)

| 模式名稱 | 應用對象       | 職責與實現細節 |
|----------|----------------|----------------|
| **單例模式 (Singleton)** | GameManager | 確保遊戲全局只有一個實例。管理遊戲全局狀態（暫停/運行）、資源載入，提供統一 UI 更新介面。 |
| **工廠模式 (Factory)**   | MobFactory | 集中處理怪物創建邏輯。怪物類型：`ZombieMob` (基礎)、`SkeletonMob` (遠程)、`CreeperMob` (爆炸)、`SpiderMob` (特殊加速)。 |
| **策略模式 (Strategy)**  | WeaponController | 運行時切換不同攻擊行為。策略類型：`PistolStrategy` (單發)、`ShotgunStrategy` (散射)、`RocketStrategy` (範圍爆炸)。 |
| **裝飾器模式 (Decorator)** | PlayerStats | 動態添加玩家屬性增益 (Buff/技能)。裝飾器：`DamageBoostDecorator` (+N 傷害)、`SpeedBoostDecorator` (+M 速度)，效果可疊加。 |
| **觀察者模式 (Observer)** | Achievement System | 實現事件發布/訂閱機制。<br>主題 (Subject)：`GameEventBus`，負責發佈事件。<br>事件類型：`MobKilled`、`LevelUp`、`WeaponSwitched`。<br>觀察者 (Observer)：`AchievementTracker`，監聽事件並檢查達成特定成就。<br>提供方法：`subscribe()`, `unsubscribe()`, `notify()`。 |

---

## 區塊 4：前端程式碼要求 (UI & Interaction)
- **UI 互動**：
  - 切換武器 (Strategy)
  - 增加屬性/技能 (Decorator)
  - 「查看成就」/「模擬事件」按鈕，用於測試觀察者模式
- **介面模擬**：
  - `interface IWeaponStrategy`
  - `type IObserver = { update: (event: string, data: any) => void }`
  - 使用 TypeScript 註解清楚描述類型和結構
