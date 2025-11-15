# 🎮 2D 射擊遊戲：專案架構文檔

## 專案概述
這是一個使用 TypeScript 和 Phaser 3 遊戲引擎開發的 2D 俯視射擊遊戲，採用模組化架構，並實作了多種設計模式，用於軟體設計模式教學演示。

---

## 核心約束
- **模組化架構**：使用 TypeScript 類別與介面組織程式碼，遵循嚴格 TS 類型設計。
- **遊戲引擎**：使用 Phaser 3 框架處理遊戲渲染、物理引擎和場景管理。
- **無後端依賴**：純前端單機遊戲，無需伺服器或資料庫。
- **高可讀性註解**：為所有類別、方法及設計模式應用提供詳細中文註解，說明：
  - 這是什麼模式
  - 為什麼使用
  - 如何實現

---

## 區塊 1：技術棧與環境要求 (Technology Stack)

| 項目       | 技術                 | 說明                                                         |
|------------|--------------------|------------------------------------------------------------|
| 前端框架   | TypeScript         | 提供類型安全和現代 ES6+ 語法支援                               |
| 遊戲引擎   | Phaser 3           | 處理 2D 渲染、物理引擎、場景管理和輸入處理                       |
| 建置工具   | Vite               | 快速開發伺服器和模組打包工具                                   |
| 遊戲視圖   | Canvas API (透過 Phaser) | 實現 2D 繪製和遊戲循環                                       |
| 程式碼品質 | 詳盡中文註解           | 針對設計模式應用提供極為詳細註解                               |

---

## 區塊 2：遊戲設計與核心邏輯 (Game Design & Logic)

### 遊戲視圖
- **視角**：2D 俯視視角 (平面設計)，模擬 Minecraft 像素風格
- **場景管理**：使用 Phaser 3 的 Scene 系統，分離遊戲邏輯場景 (`GameScene`) 和 UI 場景 (`UIScene`)

### 核心交互
- **玩家移動**：WASD 或方向鍵控制玩家移動
- **玩家射擊**：滑鼠點擊發射武器
- **武器切換**：可在不同武器策略間切換（弓、劍、TNT）
- **經驗值系統**：擊殺怪物獲得經驗值，累積後升級
- **屬性增益**：使用裝飾器模式動態添加玩家屬性增益

### 遊戲機制
- **單機運行**：僅支援單人體驗
- **怪物生成**：定時生成不同類型的怪物
- **碰撞檢測**：使用 Phaser 物理引擎處理玩家、子彈、怪物間的碰撞
- **暫停系統**：支援遊戲暫停/繼續功能

---

## 區塊 3：設計模式的精確實施 (Design Pattern Implementation)

| 模式名稱 | 應用對象       | 職責與實現細節 |
|----------|----------------|----------------|
| **單例模式 (Singleton)** | `GameManager` | 確保遊戲全局只有一個實例。管理遊戲全局狀態（暫停/運行）、分數追蹤、場景間通訊（透過 Phaser EventEmitter），提供統一的事件總線介面。使用私有構造函數和靜態 `getInstance()` 方法實現。 |
| **工廠模式 (Factory)**   | `MobFactory` | 集中處理怪物創建邏輯。使用靜態方法 `spawn()` 根據名稱創建對應怪物實例。怪物類型：`ZombieMob` (基礎近戰)、`SkeletonMob` (遠程弓箭手)、`CreeperMob` (爆炸傷害)、`SpiderMob` (特殊加速移動)。所有怪物繼承自 `BaseMob` 抽象類別。 |
| **策略模式 (Strategy)**  | `IWeaponStrategy` | 運行時切換不同攻擊行為。策略介面定義 `attack()` 方法，具體策略：`BowStrategy` (遠程單發弓箭)、`SwordStrategy` (近戰揮劍)、`TNTStrategy` (範圍爆炸)。玩家和怪物都可以使用武器策略，實現 `IWeaponHolder` 介面。 |
| **裝飾器模式 (Decorator)** | `IPlayerDecorator` | 動態添加玩家屬性增益 (Buff/技能)。裝飾器介面定義 `apply()` 方法。具體裝飾器：`HealthBoostDecorator` (增加最大血量)、`HealingDecorator` (立即恢復血量)、`DamageBoostDecorator` (+5 攻擊力)、`SpeedBoostDecorator` (+20 移動速度)。效果可疊加，直接修改玩家物件屬性。 |
| **觀察者模式 (Observer)** | `GameManager` (事件總線) | 實現事件發布/訂閱機制。`GameManager` 繼承自 `Phaser.Events.EventEmitter`，作為主題 (Subject) 負責發佈事件。事件類型：`game-started`、`game-paused`、`player-die`、`update-stats`、`weapon-change`。觀察者 (Observer)：`UIScene` 和其他場景，透過 `on()` 方法訂閱事件並更新 UI。提供方法：`emit()`, `on()`, `off()` (透過 Phaser EventEmitter)。 |

---

## 區塊 4：專案結構與檔案組織 (Project Structure)

```
shooter/
├── src/
│   ├── core/
│   │   └── GameManager.ts          # 單例模式：遊戲管理器
│   ├── mobs/
│   │   ├── BaseMob.ts              # 抽象基底類別
│   │   ├── MobFactory.ts           # 工廠模式：怪物工廠
│   │   ├── Zombie.ts               # 殭屍怪物
│   │   ├── Skeleton.ts             # 骷髏怪物（遠程）
│   │   ├── Creeper.ts              # 苦力怕（爆炸）
│   │   ├── Spider.ts               # 蜘蛛（加速）
│   │   ├── ArrowMob.ts             # 箭矢實體
│   │   └── XpMob.ts                # 經驗值球
│   ├── player/
│   │   ├── Player.ts               # 玩家類別
│   │   └── IPlayerDecorator.ts     # 裝飾器模式：玩家屬性增益
│   ├── weapons/
│   │   ├── IWeaponStrategy.ts      # 策略模式：武器策略介面
│   │   ├── BowStrategy.ts          # 弓策略
│   │   ├── SwordStrategy.ts        # 劍策略
│   │   └── TNTStrategy.ts          # TNT 策略
│   ├── scenes/
│   │   ├── GameScene.ts            # 遊戲主場景
│   │   └── UIScene.ts              # UI 場景
│   └── main.ts                     # 應用程式入口
├── public/
│   └── assets/                     # 遊戲資源（圖片、音效）
│       ├── mobs/                   # 怪物圖片
│       └── weapons/                # 武器圖片
├── package.json
├── tsconfig.json
└── index.html
```

---

## 區塊 5：核心類別說明 (Core Classes)

### GameManager (單例模式)
- **職責**：管理遊戲全局狀態、場景間通訊、分數追蹤
- **關鍵方法**：
  - `getInstance()`: 獲取單例實例
  - `setPause()`: 設置遊戲暫停狀態
  - `updateScore()`: 更新分數
  - `notifyStatsUpdate()`: 發送統計更新事件
  - `notifyWeaponChange()`: 發送武器變更事件

### Player
- **職責**：玩家實體，管理血量、經驗值、武器、移動
- **關鍵屬性**：
  - `health`, `maxHealth`: 生命值
  - `level`, `xp`, `xpToNextLevel`: 等級系統
  - `attackDamage`: 攻擊力
  - `moveSpeedBonus`: 移動速度加成
- **關鍵方法**：
  - `setWeapon()`: 切換武器策略
  - `attack()`: 使用當前武器攻擊
  - `takeDamage()`: 承受傷害
  - `addXp()`: 增加經驗值

### BaseMob (抽象類別)
- **職責**：所有怪物的基底類別，定義共同行為
- **關鍵屬性**：
  - `hp`, `speed`, `attackDamage`: 怪物屬性
  - `weaponStrategy`: 武器策略（部分怪物使用）
- **關鍵方法**：
  - `setTarget()`: 設置追擊目標（玩家）
  - `updateBehavior()`: 更新行為（追擊玩家）
  - `takeDamage()`: 承受傷害

### MobFactory (工廠模式)
- **職責**：根據名稱創建對應的怪物實例
- **關鍵方法**：
  - `spawn(name, scene, pos, player)`: 創建怪物並設置目標

### IWeaponStrategy (策略模式介面)
- **職責**：定義武器攻擊行為的統一介面
- **關鍵方法**：
  - `attack(scene, holder, pointer, target)`: 執行攻擊邏輯
- **實作類別**：
  - `BowStrategy`: 遠程單發弓箭
  - `SwordStrategy`: 近戰揮劍（創建攻擊判定區）
  - `TNTStrategy`: 範圍爆炸傷害

### IPlayerDecorator (裝飾器模式介面)
- **職責**：定義玩家屬性增益的統一介面
- **關鍵方法**：
  - `apply()`: 應用增益效果
- **實作類別**：
  - `HealthBoostDecorator`: 增加最大血量
  - `HealingDecorator`: 立即恢復血量
  - `DamageBoostDecorator`: 增加攻擊力
  - `SpeedBoostDecorator`: 增加移動速度

---

## 區塊 6：遊戲流程 (Game Flow)

1. **初始化階段**：
   - 載入遊戲資源（圖片、音效）
   - 初始化 `GameManager` 單例
   - 創建 `GameScene` 和 `UIScene`
   - 初始化玩家物件

2. **遊戲循環**：
   - 處理玩家輸入（移動、射擊）
   - 更新怪物行為（追擊玩家、攻擊）
   - 檢測碰撞（子彈與怪物、玩家與怪物）
   - 更新 UI（血量、分數、經驗值）
   - 定時生成新怪物

3. **事件系統**：
   - `GameManager` 作為事件總線，發送各種遊戲事件
   - `UIScene` 訂閱事件並更新 UI 顯示
   - 支援事件：遊戲開始/暫停、玩家死亡、統計更新、武器變更

4. **升級系統**：
   - 擊殺怪物獲得經驗值
   - 經驗值累積達到閾值時升級
   - 升級時可觸發事件通知 UI

---

## 區塊 7：擴展性與維護性 (Extensibility & Maintainability)

### 新增怪物類型
1. 創建新的怪物類別，繼承 `BaseMob`
2. 在 `MobFactory.spawn()` 中添加新的 case
3. 添加對應的圖片資源

### 新增武器策略
1. 創建新的策略類別，實作 `IWeaponStrategy`
2. 在 `GameScene` 或相關場景中註冊新武器
3. 添加對應的圖片資源

### 新增玩家裝飾器
1. 創建新的裝飾器類別，實作 `IPlayerDecorator`
2. 在 `apply()` 方法中實現增益邏輯
3. 在需要的地方調用裝飾器

### 新增遊戲事件
1. 在 `GameManager` 的 `GameEvents` 介面中定義新事件類型
2. 使用 `emit()` 發送事件
3. 在需要的地方使用 `on()` 訂閱事件

---

## 區塊 8：技術細節 (Technical Details)

### 物理引擎
- 使用 Phaser 3 的 Arcade Physics 進行碰撞檢測
- 支援世界邊界碰撞 (`setCollideWorldBounds`)
- 使用群組 (`Group`) 管理子彈和怪物

### 場景管理
- 使用 Phaser 3 的 Scene 系統分離遊戲邏輯和 UI
- `GameScene`: 處理遊戲邏輯、物理、渲染
- `UIScene`: 處理 UI 顯示和互動

### 資源管理
- 使用 Phaser 的 Loader 系統載入圖片資源
- 資源路徑：`public/assets/`
- 支援 JPG、PNG、WEBP 格式

### 輸入處理
- 鍵盤輸入：使用 Phaser 的 `cursors` 和自定義 `wasd` 物件
- 滑鼠輸入：使用 Phaser 的 `Pointer` 物件處理點擊和位置

---

## 區塊 9：開發與建置 (Development & Build)

### 開發環境
```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

### 建置生產版本
```bash
# 編譯 TypeScript 並打包
npm run build
```

### 預覽生產版本
```bash
# 預覽建置結果
npm run preview
```

---

## 區塊 10：未來改進方向 (Future Improvements)

- [ ] 添加音效和背景音樂
- [ ] 實現成就系統（完整觀察者模式演示）
- [ ] 添加更多怪物類型和武器策略
- [ ] 實現技能樹系統
- [ ] 添加關卡系統
- [ ] 優化性能（物件池、資源快取）
- [ ] 添加遊戲存檔功能
- [ ] 實現更多視覺效果（粒子系統、動畫）

