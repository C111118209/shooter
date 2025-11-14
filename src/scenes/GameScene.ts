import Phaser from "phaser";
import { MobFactory } from "../mobs/MobFactory";
import { BaseMob } from "../mobs/BaseMob";
import { ArrowMob } from "../mobs/ArrowMob";
import { SkeletonMob } from "../mobs/Skeleton";
import { CreeperMob } from "../mobs/Creeper";

import { Player } from "../player/Player";
import { BowStrategy } from "../weapons/BowStrategy";
import { SwordStrategy } from "../weapons/SwordStrategy";
import { TNTStrategy } from "../weapons/TNTStrategy";

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

  get score(): number {
    return this._score;
  }

  set score(value: number) {
    this._score = value;
    // 分數變更時發送更新事件給 UIScene
    this.events.emit("update-stats", {
      health: this.playerObj.health,
      maxHealth: this.playerObj.maxHealth,
      score: this._score,
    });
  }

  private isPaused: boolean = true;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private playerIsInvulnerable: boolean = false;

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
    this.load.image("tnt", "https://labs.phaser.io/assets/sprites/block.png");
  }

  create() {
    // 重置所有狀態
    this.isPaused = true;
    this._score = 0;
    this.enemies = [];
    this.playerIsInvulnerable = false;

    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.setBackgroundColor("#4488AA");

    // 初始化玩家 (會順便創建 weaponSprite)
    this.playerObj = new Player(this, 400, 300, "steve", new BowStrategy());
    this.playerObj.setWeapon(new BowStrategy(), "bow");
    this.events.emit("weapon-change", { key: "bow", name: "🏹 弓" });
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
      this.scene.launch("UIScene");
    }

    // 遊戲開始事件 (由 UIScene 的主選單觸發)
    this.events.once("game-started", this.startGame, this);

    // 初始血量/分數發送 (供 UI 初始化)
    this.events.emit("update-stats", {
      health: this.playerObj.health,
      maxHealth: this.playerObj.maxHealth,
      score: this._score,
    });

    // 初始暫停，等待主選單
    this.physics.pause();
  }

  private startGame() {
    this.isPaused = false;
    this.playerObj.sprite.setActive(true).setVisible(true); // 顯示玩家
    this.physics.resume();
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
        this.events.emit("weapon-change", { key: "bow", name: "🏹 弓" });
      });
    this.input.keyboard
      ?.addKey(Phaser.Input.Keyboard.KeyCodes.TWO)
      .on("down", () => {
        if (this.isPaused || this.playerObj.isDead) return;
        this.playerObj.setWeapon(new SwordStrategy(), "iron_sword");
        this.events.emit("weapon-change", { key: "iron_sword", name: "⚔ 劍" });
      });
    this.input.keyboard
      ?.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)
      .on("down", () => {
        if (this.isPaused || this.playerObj.isDead) return;
        this.playerObj.setWeapon(new TNTStrategy(), "tnt");
        this.events.emit("weapon-change", { key: "tnt", name: "💣 TNT" });
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
    // 修正 3: 確保遊戲結束或暫停時，update 邏輯停止
    if (this.isPaused || this.playerObj.isDead) {
      this.playerObj.sprite.setVelocity(0, 0);
      this.playerObj.weaponSprite.setVisible(false);
      return;
    }
    this.playerObj.weaponSprite.setVisible(true);

    const speed = 200;
    this.playerObj.move(this.cursors, this.wasd, speed);
    this.playerObj.updateWeaponRotation(this.input.activePointer);

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
        damage?: number;
        explosionRadius?: number;
      };

      if (tnt.texture.key === "tnt" && !tnt.listeners("explode").length) {
        tnt.once("explode", (tntInstance: typeof tnt) =>
          this.handleTNTExplosion(
            tntInstance as typeof tnt & {
              damage: number;
              explosionRadius: number;
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

  private togglePause() {
    if (
      this.playerObj.isDead ||
      !this.mobSpawnTimer ||
      (this.isPaused && !this.scene.isActive("UIScene"))
    )
      return;

    this.isPaused = !this.isPaused;
    this.events.emit("game-paused", this.isPaused);

    if (this.isPaused) {
      this.physics.pause();
      this.mobSpawnTimer.paused = true;
    } else {
      this.physics.resume();
      this.mobSpawnTimer.paused = false;
    }
  }

  // ------------------------------------
  // 怪物/玩家狀態方法
  // ------------------------------------

  // 處理怪物死亡 (加分)
  private handleMobDeath(mob: BaseMob) {
    this.score += 10;
    this.enemies = this.enemies.filter((m) => m !== mob);
  }

  // 處理玩家死亡 (遊戲結束)
  private handlePlayerDeath() {
    // 修正 3: 確保所有遊戲元素停止
    this.isPaused = true;
    this.playerObj.sprite.setTint(0xff0000);
    this.physics.pause();
    if (this.mobSpawnTimer) this.mobSpawnTimer.destroy();

    // 停止所有怪物的移動
    this.mobGroup.children.each((mob) => {
      (mob as BaseMob).setVelocity(0);
      (mob as BaseMob).body!.enable = false; // 禁用物理碰撞和移動
      return null;
    });

    // 發送死亡事件給 UIScene 顯示死亡選單
    this.events.emit("player-die");
  }

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
      }
      return;
    }
    const damage = projectile.damage !== undefined ? projectile.damage : 10;
    projectile.destroy();
    mob.takeDamage(damage);
  }

  private handleMobBulletHitPlayer(
    playerSprite: Phaser.Physics.Arcade.Sprite,
    bullet: ArrowMob
  ) {
    if (this.playerObj.isDead || this.playerIsInvulnerable) {
      bullet.destroy();
      return;
    }
    this.playerObj.takeDamage(bullet.damage, this);
    bullet.destroy();
    this.playerIsInvulnerable = true;
    playerSprite.setTint(0xdd0000);
    this.time.delayedCall(500, () => {
      this.playerIsInvulnerable = false;
      if (!this.playerObj.isDead) playerSprite.clearTint();
    });
  }

  private handleSwordHitMob(hitBox: Phaser.GameObjects.Zone, mob: BaseMob) {
    if (hitBox.getData("hit")) return;
    hitBox.setData("hit", true);
    const damage = hitBox.getData("damage") as number;
    mob.takeDamage(damage);
    hitBox.destroy();
    this.playerObj.swordHitBox = null;
  }

  private handleMobHitPlayer(
    playerSprite: Phaser.Physics.Arcade.Sprite,
    mob: BaseMob
  ) {
    if (this.playerObj.isDead || this.playerIsInvulnerable) return;
    if (mob instanceof CreeperMob) return;
    const damage = 10;
    this.playerObj.takeDamage(damage, this);
    this.playerIsInvulnerable = true;
    playerSprite.setTint(0xdd0000);
    this.time.delayedCall(500, () => {
      this.playerIsInvulnerable = false;
      if (!this.playerObj.isDead) playerSprite.clearTint();
    });
    const dx = playerSprite.x - mob.x;
    const dy = playerSprite.y - mob.y;
    playerSprite.setVelocity(dx * 5, dy * 5);
    this.time.delayedCall(100, () => playerSprite.setVelocity(0));
  }

  private processExplosion(data: ExplosionData) {
    const distanceToPlayer = Phaser.Math.Distance.Between(
      data.x,
      data.y,
      this.playerObj.sprite.x,
      this.playerObj.sprite.y
    );
    if (distanceToPlayer <= data.radius) {
      const effectiveDamage = Math.floor(
        data.damage * (1 - distanceToPlayer / data.radius)
      );
      if (effectiveDamage > 0) {
        this.playerObj.takeDamage(effectiveDamage, this);
        this.playerIsInvulnerable = true;
        this.playerObj.sprite.setTint(0xdd0000);
        this.time.delayedCall(500, () => {
          this.playerIsInvulnerable = false;
          if (!this.playerObj.isDead) this.playerObj.sprite.clearTint();
        });
      }
    }
    const explosionZone = this.add.zone(
      data.x,
      data.y,
      data.radius * 2,
      data.radius * 2
    );
    this.physics.world.enable(explosionZone);
    (explosionZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (explosionZone.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    this.physics.overlap(
      explosionZone,
      this.mobGroup,
      (zone, mobObj) => {
        const mob = mobObj as BaseMob;
        if (mob.active) {
          const distToMob = Phaser.Math.Distance.Between(
            data.x,
            data.y,
            mob.x,
            mob.y
          );
          if (distToMob <= data.radius) {
            const effectiveDamage = Math.floor(
              data.damage * (1 - distToMob / data.radius)
            );
            if (effectiveDamage > 0) {
              mob.takeDamage(effectiveDamage);
            }
          }
        }
      },
      undefined,
      this
    );
    this.time.delayedCall(100, () => explosionZone.destroy());
  }

  private handleTNTExplosion(
    tnt: Phaser.Physics.Arcade.Image & {
      damage: number;
      explosionRadius: number;
    }
  ) {
    const explosionCircle = this.add.circle(
      tnt.x,
      tnt.y,
      tnt.explosionRadius,
      0xffa500,
      0.5
    );
    this.time.delayedCall(300, () => {
      explosionCircle.destroy();
    });
    this.processExplosion({
      x: tnt.x,
      y: tnt.y,
      damage: tnt.damage,
      radius: tnt.explosionRadius,
    });
  }

  private handleCreeperExplosion(data: ExplosionData) {
    this.processExplosion(data);
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

    const mob = MobFactory.spawn(type, this, { x, y }, this.playerObj.sprite);

    this.mobGroup.add(mob);
    this.enemies.push(mob);

    mob.on("mob-die", this.handleMobDeath, this);
    mob.on("creeper-explode", this.handleCreeperExplosion, this);
  }
}
