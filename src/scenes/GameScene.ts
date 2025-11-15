import Phaser from "phaser";
import { MobFactory } from "../mobs/MobFactory";
import { BaseMob } from "../mobs/BaseMob";
import { ArrowMob } from "../mobs/ArrowMob";
import { SkeletonMob } from "../mobs/Skeleton";

import { Player } from "../player/Player";
import { BowStrategy } from "../weapons/BowStrategy";
import { SwordStrategy } from "../weapons/SwordStrategy";
import { TNTStrategy } from "../weapons/TNTStrategy";
import { XpMob } from "../mobs/XpMob";
import { GameManager } from "../core/GameManager";

type WASD = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

// Define the shape of the explosion data sent from the Creeper or TNT
type ExplosionData = { x: number; y: number; damage: number; radius: number };

export default class GameScene extends Phaser.Scene {
  playerObj!: Player;
  private mobGroup!: Phaser.Physics.Arcade.Group;
  private enemies: BaseMob[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASD;
  private _score: number = 0;
  private mobSpawnTimer!: Phaser.Time.TimerEvent;
  private gameManager!: GameManager;

  get score(): number {
    return this._score;
  }

  set score(value: number) {
    this._score = value;
    // 使用 GameManager 更新分數
    this.gameManager.updateScore(this._score);
  }

  public get isPaused(): boolean {
    return this.gameManager.getPaused();
  }

  private pauseKey!: Phaser.Input.Keyboard.Key;

  // 🆕 gameTick 系統：管理所有受遊戲暫停控制的計時器
  private gameTimers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super("GameScene");
  }

  preload() {
    // 玩家和怪物資源
    this.load.image("steve", "assets/mobs/steve.jpg");
    this.load.image("zombie", "assets/mobs/zombie.jpg");
    this.load.image("skeleton", "assets/mobs/skeleton.jpg");
    this.load.image("creeper", "assets/mobs/creeper.jpg");
    this.load.image("spider", "assets/mobs/spider.jpg");

    // 武器資源
    this.load.image("arrow", "assets/weapons/arrow.webp");
    this.load.image("bow", "assets/weapons/bow.webp");
    this.load.image("iron_sword", "assets/weapons/iron_sword.webp");
    this.load.image("tnt", "assets/weapons/tnt.png");
    this.load.image("xp_ball", "assets/mobs/xp_ball.png");
  }

  create() {
    // 初始化 GameManager
    this.gameManager = GameManager.getInstance();
    const uiScene = this.scene.get("UIScene");
    if (uiScene) {
      this.gameManager.initialize(this, uiScene);
    }

    // 重置所有狀態
    this.gameManager.reset();
    this._score = 0;
    this.enemies = [];
    // 清理所有 gameTick 計時器
    this.gameTimers.forEach((timer) => {
      if (timer && !timer.hasDispatched) {
        timer.destroy();
      }
    });
    this.gameTimers = [];

    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.setBackgroundColor("#4488AA");

    // 初始化玩家 (會順便創建 weaponSprite)
    this.playerObj = new Player(this, 400, 300, "steve", new BowStrategy());
    // 這些將被移到 startGame() 中執行，確保 UIScene 已經準備好接收事件。
    this.playerObj.sprite.setActive(false).setVisible(false); // 初始隱藏玩家，直到遊戲開始

    // 怪物群組初始化
    this.mobGroup = this.physics.add.group({
      classType: BaseMob,
      runChildUpdate: true,
    });

    // 輸入設定
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as WASD;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused || this.playerObj.isDead) return;
      this.playerObj.attack(this, pointer);
    });

    this.setupKeyHandlers();
    this.setupCollisions();

    // 啟動 UI Scene
    if (!this.scene.isActive("UIScene")) {
      this.scene.launch("UIScene", { player: this.playerObj });
      // 重新初始化 GameManager（確保 UIScene 已啟動）
      const updatedUIScene = this.scene.get("UIScene");
      if (updatedUIScene) {
        this.gameManager.initialize(this, updatedUIScene);
      }
    }

    // 通過 GameManager 監聽遊戲開始事件 (由 UIScene 的主選單觸發)
    this.gameManager.once("game-started", this.startGame, this);

    // 通過 GameManager 監聽玩家死亡事件
    this.gameManager.once("player-die", this.handlePlayerDeath, this);

    // 升級事件現在由 UIScene 處理，不需要在這裡監聽

    // 初始暫停，等待主選單
    this.gameManager.setPause(true);
  }

  public handleResize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    // 更新物理世界邊界
    this.physics.world.setBounds(0, 0, width, height);

    // 調整玩家位置避免跑出邊界
    if (this.playerObj?.sprite) {
      const player = this.playerObj.sprite;
      player.x = Phaser.Math.Clamp(player.x, 0, width);
      player.y = Phaser.Math.Clamp(player.y, 0, height);
    }
  }

  private startGame() {
    this.gameManager.setPause(false);
    this.playerObj.sprite.setActive(true).setVisible(true); // 顯示玩家

    // 修正: 延遲武器初始化，確保 UIScene 元素在事件發送時已經存在。
    this.playerObj.setWeapon(new BowStrategy(), "bow");
    this.gameManager.notifyWeaponChange("bow", "🏹 弓");

    // 修正: 在遊戲真正開始時，同步一次 HUD 狀態
    this.gameManager.updateScore(this._score);

    this.startMobSpawning();
  }

  private setupKeyHandlers() {
    // 遊戲暫停設定 (P 鍵)
    this.pauseKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.P
    );
    this.pauseKey.on("down", this.togglePause, this);

    // 遊戲暫停設定 (新增 ESC 鍵)
    this.input
      .keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on("down", this.togglePause, this);

    // 武器切換
    this.input.keyboard
      ?.addKey(Phaser.Input.Keyboard.KeyCodes.ONE)
      .on("down", () => {
        if (this.isPaused || this.playerObj.isDead) return;
        this.playerObj.setWeapon(new BowStrategy(), "bow");
        this.gameManager.notifyWeaponChange("bow", "🏹 弓");
      });
    this.input.keyboard
      ?.addKey(Phaser.Input.Keyboard.KeyCodes.TWO)
      .on("down", () => {
        if (this.isPaused || this.playerObj.isDead) return;
        this.playerObj.setWeapon(new SwordStrategy(), "iron_sword");
        this.gameManager.notifyWeaponChange("iron_sword", "⚔ 劍");
      });
    this.input.keyboard
      ?.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)
      .on("down", () => {
        if (this.isPaused || this.playerObj.isDead) return;
        this.playerObj.setWeapon(new TNTStrategy(), "tnt");
        this.gameManager.notifyWeaponChange("tnt", "💣 TNT");
      });
  }

  private setupCollisions() {
    // 1. 玩家子彈與怪物碰撞
    this.physics.add.overlap(
      this.playerObj.bullets,
      this.mobGroup,
      this.handlePlayerBulletHitMob as (a: Object, b: Object) => void,
      undefined,
      this
    );

    // 2. 怪物與玩家的碰撞
    this.physics.add.collider(
      this.playerObj.sprite,
      this.mobGroup,
      this.handleMobHitPlayer as (a: Object, b: Object) => void,
      undefined,
      this
    );

    // 3. 怪物死亡事件監聽
    this.events.on("mob-die", this.handleMobDeath, this);
  }

  private startMobSpawning() {
    if (this.mobSpawnTimer) this.mobSpawnTimer.destroy();
    // 定時生成怪物
    this.mobSpawnTimer = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => this.spawnRandomMob(),
    });
  }

  update() {
    // 關鍵修正點: 確保遊戲結束或暫停時，update 邏輯停止
    if (this.isPaused || this.playerObj.isDead) {
      this.playerObj.sprite.setVelocity(0, 0);
      this.playerObj.weaponSprite.setVisible(false);
      return;
    }
    this.playerObj.weaponSprite.setVisible(true);

    const speed = 200;
    this.playerObj.move(this.cursors, this.wasd, speed);
    this.playerObj.updateWeaponRotation(this.input.activePointer);

    // 怪物行為更新 (僅在遊戲進行中執行)
    this.enemies.forEach((mob) => {
      if (mob.active) {
        mob.updateBehavior();
      }
    });

    // 處理劍的近戰攻擊判定
    if (this.playerObj.swordHitBox) {
      this.physics.overlap(
        this.playerObj.swordHitBox,
        this.mobGroup,
        this.handleSwordHitMob as (a: Object, b: Object) => void,
        undefined,
        this
      );
    }

    // 處理骷髏的箭矢與玩家的碰撞
    this.enemies.forEach((mob) => {
      if (mob instanceof SkeletonMob && mob.active && mob.bullets) {
        this.physics.overlap(
          mob.bullets,
          this.playerObj.sprite,
          this.handleMobBulletHitPlayer as (a: Object, b: Object) => void,
          undefined,
          this
        );
      }
    });

    // 處理 TNT 爆炸事件監聽 (邏輯不變)
    this.playerObj.bullets.children.each((obj) => {
      const tnt = obj as Phaser.Physics.Arcade.Image & {
        damage: number;
        explosionRadius: number;
      };

      if (tnt.texture.key === "tnt" && !tnt.listeners("explode").length) {
        tnt.once("explode", (_tntInstance: typeof tnt) =>
          this.processExplosion(
            {
              x: tnt.x,
              y: tnt.y,
              damage: tnt.damage,
              radius: tnt.explosionRadius,
            }
          )
        );
      }
      return null;
    });
  }

  // ------------------------------------
  // 遊戲功能方法
  // ------------------------------------

  /**
   * 核心狀態設定函數：純粹地設定遊戲的暫停/恢復狀態。
   * @param isPaused 遊戲是否應該暫停
   */
  public setPause(isPaused: boolean) {
    this.gameManager.setPause(isPaused);

    // 處理計時器暫停/恢復
    if (isPaused) {
      if (this.mobSpawnTimer) this.mobSpawnTimer.paused = true;
      // 暫停所有 gameTick 計時器
      this.gameTimers.forEach((timer) => {
        if (timer && !timer.hasDispatched) {
          timer.paused = true;
        }
      });
    } else {
      if (this.mobSpawnTimer) this.mobSpawnTimer.paused = false;
      // 恢復所有 gameTick 計時器
      this.gameTimers.forEach((timer) => {
        if (timer && !timer.hasDispatched) {
          timer.paused = false;
        }
      });

      // 確保玩家和武器精靈在恢復時是可見的
      if (this.playerObj && !this.playerObj.isDead) {
        this.playerObj.sprite.setVisible(true);
        this.playerObj.weaponSprite.setVisible(true);
      }
    }
  }

  /**
     * 玩家操作控制函數：切換遊戲的暫停狀態 (P/ESC鍵觸發)
     */
  public togglePause() {
    // 如果玩家已死亡，或怪物生成計時器不存在，則不允許玩家切換暫停
    if (
      this.playerObj.isDead ||
      !this.mobSpawnTimer
    )
      return;

    // 使用 GameManager 切換狀態
    this.gameManager.togglePause();
    const newPausedState = this.gameManager.getPaused();

    // 處理計時器暫停/恢復
    if (newPausedState) {
      if (this.mobSpawnTimer) this.mobSpawnTimer.paused = true;
      this.gameTimers.forEach((timer) => {
        if (timer && !timer.hasDispatched) {
          timer.paused = true;
        }
      });
    } else {
      if (this.mobSpawnTimer) this.mobSpawnTimer.paused = false;
      this.gameTimers.forEach((timer) => {
        if (timer && !timer.hasDispatched) {
          timer.paused = false;
        }
      });
    }
  }

  /**
   * 🆕 創建受 gameTick 控制的計時器
   * 當遊戲暫停時，這些計時器也會自動暫停
   */
  public addGameTimer(config: Phaser.Types.Time.TimerEventConfig): Phaser.Time.TimerEvent {
    const timer = this.time.addEvent(config);
    this.gameTimers.push(timer);
    // 如果當前遊戲已暫停，立即暫停這個計時器
    if (this.isPaused) {
      timer.paused = true;
    }
    return timer;
  }

  /**
   * 🆕 創建受 gameTick 控制的延遲調用
   * 當遊戲暫停時，這些延遲調用也會自動暫停
   */
  public addGameDelayedCall(
    delay: number,
    callback: Function,
    args?: any[],
    callbackScope?: any
  ): Phaser.Time.TimerEvent {
    return this.addGameTimer({
      delay: delay,
      callback: callback,
      args: args,
      callbackScope: callbackScope,
    });
  }

  /**
   * 🆕 移除 gameTick 計時器（當計時器完成或銷毀時調用）
   */
  public removeGameTimer(timer: Phaser.Time.TimerEvent) {
    const index = this.gameTimers.indexOf(timer);
    if (index > -1) {
      this.gameTimers.splice(index, 1);
    }
  }

  // ------------------------------------
  // 怪物/玩家狀態方法
  // ------------------------------------

  // 處理怪物死亡 (加分)
  private handleMobDeath(mob: BaseMob) {
    this.score += 10;
    this.enemies = this.enemies.filter((m) => m !== mob);

    // --- 生成經驗球 ---
    const xpValue = Phaser.Math.Between(5, 15); // 隨機經驗值
    const xpSize = Phaser.Math.FloatBetween(0.5, 0.8); // 隨機大小
    const xp = new XpMob(this, mob.x, mob.y, "xp_ball", { value: xpValue, size: xpSize });

    // 綁定玩家作為目標
    xp.setTarget(this.playerObj);

    // 加入場景 update
    this.enemies.push(xp);

    // 監聽玩家拾取事件
    xp.on("xp-collected", (amount: number) => {
      this.playerObj.addXp(amount, this);
    });
  }

  // 處理玩家死亡 (遊戲結束)
  private handlePlayerDeath() {
    // 修正: 確保所有遊戲元素停止
    this.playerObj.sprite.setTint(0xff0000);
    if (this.mobSpawnTimer) this.mobSpawnTimer.destroy();

    // 停止所有怪物的移動 - 這段邏輯確保遊戲結束時怪物不會再移動
    this.mobGroup.children.each((mob) => {
      (mob as BaseMob).setVelocity(0);
      (mob as BaseMob).body!.enable = false; // 禁用物理碰撞和移動
      return null;
    });

    // 使用 GameManager 發送死亡事件
    this.gameManager.notifyPlayerDeath();
  }

  // 升級選單現在由 UIScene 處理，不再需要這個方法

  // ------------------------------------
  // 碰撞與爆炸處理方法 (保持與原邏輯一致)
  // ------------------------------------

  private handlePlayerBulletHitMob(
    bullet: ArrowMob | Phaser.Physics.Arcade.Image,
    mob: BaseMob
  ) {
    const projectile = bullet as Phaser.Physics.Arcade.Image & {
      damage?: number;
      explosionRadius?: number;
    };
    if (projectile.texture.key === "tnt") {
      if (
        projectile.damage !== undefined &&
        projectile.explosionRadius !== undefined
      ) {
        projectile.emit("explode", projectile);
        projectile.destroy();
        this.processExplosion({
          x: projectile.x, y: projectile.y,
          damage: projectile.damage!,
          radius: projectile.explosionRadius!
        })
      }
      return;
    }
    const damage = projectile.damage !== undefined ? projectile.damage : 10;
    projectile.destroy();
    mob.takeDamage(damage);
  }

  private handleMobBulletHitPlayer(
    _playerSprite: Phaser.Physics.Arcade.Sprite,
    bullet: ArrowMob
  ) {
    this.playerObj.takeDamage(bullet.damage, this);
    bullet.destroy();
  }

  private handleSwordHitMob(hitBox: Phaser.GameObjects.Zone, mob: BaseMob) {
    if (mob.getData("hit")) return;
    mob.setData("hit", true);
    const damage = hitBox.getData("damage") as number;
    mob.takeDamage(damage);
  }

  private handleMobHitPlayer(
    _playerSprite: Phaser.Physics.Arcade.Sprite,
    mob: BaseMob
  ) {
    this.playerObj.takeDamage(mob.attackDamage, this, mob);
  }

  private processExplosion(data: ExplosionData) {
    const { x, y, damage, radius } = data;

    // ---- 先處理玩家爆炸範圍 ----
    const distPlayer = Phaser.Math.Distance.Between(
      x,
      y,
      this.playerObj.sprite.x,
      this.playerObj.sprite.y
    );

    if (distPlayer <= radius) {
      const effectiveDamage = Math.floor(
        damage * (1 - distPlayer / radius)
      );

      if (effectiveDamage > 0) {
        this.playerObj.takeDamage(effectiveDamage, this);
      }
    }

    // ---- 建立爆炸區域給怪物判定 ----
    const zone = this.add.zone(x, y, radius * 2, radius * 2);
    this.physics.world.enable(zone);
    const body = zone.body as Phaser.Physics.Arcade.Body;

    body.setCircle(radius);
    body.setOffset(-radius, -radius);
    body.setAllowGravity(false);
    body.setImmovable(true);

    // ---- 怪物受到爆炸傷害 ----
    this.physics.overlap(
      zone,
      this.mobGroup,
      (_, mobObj) => {
        const mob = mobObj as BaseMob;
        if (!mob.active) return;

        const distMob = Phaser.Math.Distance.Between(x, y, mob.x, mob.y);

        if (distMob <= radius) {
          const effDmg = Math.floor(
            damage * (1 - distMob / radius)
          );
          if (effDmg > 0) mob.takeDamage(effDmg);
        }
      },
      undefined,
      this
    );

    // 爆炸區域短暫存在後移除
    this.time.delayedCall(100, () => zone.destroy());

    const explosion = this.add.circle(
      x,
      y,
      radius * 0.5,
      0xff0000,
      0.5
    );
    this.tweens.add({
      targets: explosion,
      scale: 1.5, // 爆炸擴散
      alpha: 0,
      duration: 400,
      ease: "Quad.easeOut",
      onComplete: () => explosion.destroy(),
    });
  }

  private spawnRandomMob() {
    if (this.isPaused || this.playerObj.isDead) return;

    const types = ["zombie", "skeleton", "creeper", "spider"];
    const type = Phaser.Utils.Array.GetRandom(types);

    const spawnPadding = 50;
    let x: number, y: number;

    if (Phaser.Math.RND.pick([true, false])) {
      x = Phaser.Math.RND.pick([
        -spawnPadding,
        this.cameras.main.width + spawnPadding,
      ]);
      y = Phaser.Math.Between(
        -spawnPadding,
        this.cameras.main.height + spawnPadding
      );
    } else {
      x = Phaser.Math.Between(
        -spawnPadding,
        this.cameras.main.width + spawnPadding
      );
      y = Phaser.Math.RND.pick([
        -spawnPadding,
        this.cameras.main.height + spawnPadding,
      ]);
    }

    const mob = MobFactory.spawn(type, this, { x, y }, this.playerObj);

    this.mobGroup.add(mob);
    this.enemies.push(mob);

    mob.on("mob-die", this.handleMobDeath, this);
    mob.on("creeper-explode", this.processExplosion, this);
  }
}
