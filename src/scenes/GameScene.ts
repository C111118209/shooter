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
import type { MapData } from "../maps/MapTypes";

type WASD = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

type ExplosionData = { x: number; y: number; damage: number; radius: number };

export const GLOBAL_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "Microsoft JhengHei",
  color: "#ffffff",
  fontSize: "32px",
  backgroundColor: "#00000000",
  padding: { top: 10, bottom: 10, left: 10, right: 10 },
};

export default class GameScene extends Phaser.Scene {
  playerObj!: Player;
  private mobGroup!: Phaser.Physics.Arcade.Group;
  private enemies: BaseMob[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASD;
  private _score: number = 0;
  private mobSpawnTimer!: Phaser.Time.TimerEvent;
  private gameManager!: GameManager;
  private mapGraphics?: Phaser.GameObjects.Graphics;
  private wallGroup?: Phaser.Physics.Arcade.StaticGroup;
  private mapColliders: Phaser.Physics.Arcade.Collider[] = [];
  private mapTileSize: number = 64;
  private currentMap?: MapData;

  get score(): number {
    return this._score;
  }

  set score(value: number) {
    this._score = value;
    this.gameManager.updateScore(this._score);
  }

  public get isPaused(): boolean {
    return this.gameManager.getPaused();
  }

  private pauseKey!: Phaser.Input.Keyboard.Key;
  private gameTimers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("steve", "assets/mobs/steve.jpg");
    this.load.image("zombie", "assets/mobs/zombie.jpg");
    this.load.image("skeleton", "assets/mobs/skeleton.jpg");
    this.load.image("creeper", "assets/mobs/creeper.jpg");
    this.load.image("spider", "assets/mobs/spider.jpg");
    this.load.image("arrow", "assets/weapons/arrow.webp");
    this.load.image("bow", "assets/weapons/bow.webp");
    this.load.image("iron_sword", "assets/weapons/iron_sword.webp");
    this.load.image("tnt", "assets/weapons/tnt.png");
    this.load.image("xp_ball", "assets/mobs/xp_ball.png");
  }

  create() {
    this.gameManager = GameManager.getInstance();
    const uiScene = this.scene.get("UIScene");
    if (uiScene) {
      this.gameManager.initialize(this, uiScene);
    }

    this.gameManager.reset();
    this._score = 0;
    this.enemies = [];
    this.gameTimers.forEach((timer) => {
      if (timer && !timer.hasDispatched) timer.destroy();
    });
    this.gameTimers = [];

    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.setBackgroundColor("#4488AA");

    this.playerObj = new Player(this, 400, 300, "steve", new BowStrategy());
    this.playerObj.sprite.setActive(false).setVisible(false);

    this.mobGroup = this.physics.add.group({
      classType: BaseMob,
      runChildUpdate: true,
    });

    this.applyMapData(this.gameManager.getMapData() ?? this.createDefaultMap());

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

    if (!this.scene.isActive("UIScene")) {
      this.scene.launch("UIScene", { player: this.playerObj });
      const updatedUIScene = this.scene.get("UIScene");
      if (updatedUIScene) {
        this.gameManager.initialize(this, updatedUIScene);
      }
    }

    this.gameManager.once("game-started", this.startGame, this);
    this.gameManager.once("player-die", this.handlePlayerDeath, this);
    this.gameManager.setPause(true);
  }

  private startGame() {
    this.startMiniGame();

    this.gameManager.setPause(false);
    this.playerObj.sprite.setActive(true).setVisible(true);
    this.cameras.main.startFollow(this.playerObj.sprite, true, 0.1, 0.1);
    this.playerObj.setWeapon(new BowStrategy(), "bow");
    this.gameManager.notifyWeaponChange("bow", "🏹 弓");
    this.gameManager.updateScore(this._score);
    this.startMobSpawning();
  }

  public applyMapData(mapData: MapData) {
    this.currentMap = mapData;
    if (!this.mapGraphics) {
      this.mapGraphics = this.add.graphics({ x: 0, y: 0 }).setDepth(0);
    } else {
      this.mapGraphics.clear();
    }

    if (!this.wallGroup) {
      this.wallGroup = this.physics.add.staticGroup();
    } else {
      this.wallGroup.clear(true, true);
    }

    const tileSize = this.mapTileSize;
    const rows = mapData.grid.length;
    const cols = mapData.grid[0].length;
    const mapWidth = cols * tileSize;
    const mapHeight = rows * tileSize;

    const viewWidth = this.scale.width;
    const viewHeight = this.scale.height;
    const offsetX = mapWidth < viewWidth ? (viewWidth - mapWidth) / 2 : 0;
    const offsetY = mapHeight < viewHeight ? (viewHeight - mapHeight) / 2 : 0;

    this.mapGraphics.fillStyle(0x2d7a2d, 1);
    this.mapGraphics.fillRect(offsetX, offsetY, mapWidth, mapHeight);

    mapData.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== "wall") return;
        const worldX = offsetX + x * tileSize + tileSize / 2;
        const worldY = offsetY + y * tileSize + tileSize / 2;
        const wall = this.add
          .rectangle(worldX, worldY, tileSize, tileSize, 0x555555, 1)
          .setStrokeStyle(1, 0x777777)
          .setDepth(20);
        this.physics.add.existing(wall, true);
        const body = wall.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(tileSize, tileSize);
        body.setOffset(0, 0);
        this.wallGroup!.add(wall);
      });
    });

    const worldWidth = Math.max(viewWidth, mapWidth);
    const worldHeight = Math.max(viewHeight, mapHeight);
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    if (this.playerObj?.sprite) {
      this.playerObj.sprite.setPosition(
        offsetX + mapWidth / 2,
        offsetY + mapHeight / 2
      );
    }

    this.rebuildMapColliders();
  }

  private setupKeyHandlers() {
    this.pauseKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.P
    );
    this.pauseKey.on("down", this.togglePause, this);
    this.input
      .keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on("down", this.togglePause, this);

    const keys = { ONE: "bow", TWO: "iron_sword", THREE: "tnt" };
    const strategies = {
      bow: BowStrategy,
      iron_sword: SwordStrategy,
      tnt: TNTStrategy,
    };
    const names = { bow: "🏹 弓", iron_sword: "⚔ 劍", tnt: "💣 TNT" };

    Object.entries(keys).forEach(([key, id]) => {
      this.input.keyboard
        ?.addKey(
          Phaser.Input.Keyboard.KeyCodes[
            key as keyof typeof Phaser.Input.Keyboard.KeyCodes
          ]
        )
        .on("down", () => {
          if (this.isPaused || this.playerObj.isDead) return;
          this.playerObj.setWeapon(
            new strategies[id as keyof typeof strategies](),
            id
          );
          this.gameManager.notifyWeaponChange(
            id,
            names[id as keyof typeof names]
          );
        });
    });
  }

  private setupCollisions() {
    this.physics.add.overlap(
      this.playerObj.bullets,
      this.mobGroup,
      this.handlePlayerBulletHitMob as any,
      undefined,
      this
    );
    this.physics.add.collider(
      this.playerObj.sprite,
      this.mobGroup,
      this.handleMobHitPlayer as any,
      undefined,
      this
    );
    this.events.on("mob-die", this.handleMobDeath, this);
    this.rebuildMapColliders();
  }

  private startMobSpawning() {
    if (this.mobSpawnTimer) this.mobSpawnTimer.destroy();
    this.mobSpawnTimer = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => this.spawnRandomMob(),
    });
  }

  /**
   * 修正重點：在這裡建立玩家子彈與牆的碰撞。
   * 骷髏的箭矢因為是動態生成的，我們會在 spawnRandomMob 裡面處理。
   */
  private rebuildMapColliders() {
    this.mapColliders.forEach((c) => c.destroy());
    this.mapColliders = [];
    if (!this.wallGroup) return;

    this.mapColliders.push(
      this.physics.add.collider(this.playerObj.sprite, this.wallGroup)
    );
    this.mapColliders.push(
      this.physics.add.collider(this.mobGroup, this.wallGroup)
    );

    // 玩家子彈碰撞牆壁
    this.mapColliders.push(
      this.physics.add.collider(
        this.playerObj.bullets,
        this.wallGroup,
        (bulletObj) => {
          this.handleProjectileHitWall(
            bulletObj as Phaser.Physics.Arcade.Image
          );
        }
      )
    );
  }

  private handleProjectileHitWall(
    projectile: Phaser.Physics.Arcade.Image & {
      damage?: number;
      explosionRadius?: number;
    }
  ) {
    if (projectile.texture.key === "tnt" && projectile.damage !== undefined) {
      this.processExplosion({
        x: projectile.x,
        y: projectile.y,
        damage: projectile.damage,
        radius: projectile.explosionRadius || 100,
      });
    }
    projectile.destroy();
  }

  update() {
    if (this.isPaused || this.playerObj.isDead) {
      this.playerObj.sprite.setVelocity(0, 0);
      this.playerObj.weaponSprite.setVisible(false);
      return;
    }
    this.playerObj.weaponSprite.setVisible(true);

    this.playerObj.move(this.cursors, this.wasd, 200);
    this.playerObj.updateWeaponRotation(this.input.activePointer);

    this.enemies.forEach((mob) => {
      if (mob.active) {
        mob.updateBehavior();
        // 處理骷髏子彈與玩家碰撞
        if (mob instanceof SkeletonMob && mob.bullets) {
          this.physics.overlap(
            mob.bullets,
            this.playerObj.sprite,
            this.handleMobBulletHitPlayer as any,
            undefined,
            this
          );
        }
      }
    });

    if (this.playerObj.swordHitBox) {
      this.physics.overlap(
        this.playerObj.swordHitBox,
        this.mobGroup,
        this.handleSwordHitMob as any,
        undefined,
        this
      );
    }

    // TNT 爆炸監聽
    this.playerObj.bullets.children.each((obj) => {
      const tnt = obj as any;
      if (tnt.texture.key === "tnt" && !tnt.listeners("explode").length) {
        tnt.once("explode", () =>
          this.processExplosion({
            x: tnt.x,
            y: tnt.y,
            damage: tnt.damage,
            radius: tnt.explosionRadius,
          })
        );
      }
      return null;
    });
  }

  private spawnRandomMob() {
    if (this.isPaused || this.playerObj.isDead) return;

    const types = ["zombie", "skeleton", "creeper", "spider"];
    const type = Phaser.Utils.Array.GetRandom(types);
    const spawnPadding = 50;
    let x = 0,
      y = 0;

    if (Phaser.Math.RND.pick([true, false])) {
      x = Phaser.Math.RND.pick([
        -spawnPadding,
        this.scale.width + spawnPadding,
      ]);
      y = Phaser.Math.Between(-spawnPadding, this.scale.height + spawnPadding);
    } else {
      x = Phaser.Math.Between(-spawnPadding, this.scale.width + spawnPadding);
      y = Phaser.Math.RND.pick([
        -spawnPadding,
        this.scale.height + spawnPadding,
      ]);
    }

    const mob = MobFactory.spawn(type, this, { x, y }, this.playerObj);
    this.mobGroup.add(mob);
    this.enemies.push(mob);

    // 🆕 核心修正：動態為新生成的骷髏箭矢綁定牆壁碰撞
    if (type === "skeleton" && (mob as any).bullets && this.wallGroup) {
      this.physics.add.collider(
        (mob as any).bullets,
        this.wallGroup,
        (proj) => {
          this.handleProjectileHitWall(proj as Phaser.Physics.Arcade.Image);
        }
      );
    }

    mob.on("mob-die", this.handleMobDeath, this);
    mob.on("creeper-explode", this.processExplosion, this);
  }

  // ------------------------------------
  // 以下為其餘工具方法 (保持不變)
  // ------------------------------------

  public togglePause() {
    if (this.playerObj.isDead || !this.mobSpawnTimer) return;
    this.gameManager.togglePause();
    const paused = this.gameManager.getPaused();
    if (this.mobSpawnTimer) this.mobSpawnTimer.paused = paused;
    this.gameTimers.forEach((t) => (t.paused = paused));
  }

  private handleMobDeath(mob: BaseMob) {
    this.score += 10;
    this.enemies = this.enemies.filter((m) => m !== mob);
    const xp = new XpMob(this, mob.x, mob.y, "xp_ball", {
      value: Phaser.Math.Between(5, 15),
      size: 0.6,
    });
    xp.setTarget(this.playerObj);
    this.enemies.push(xp);
    xp.on("xp-collected", (amount: number) =>
      this.playerObj.addXp(amount, this)
    );
  }

  private handlePlayerDeath() {
    this.playerObj.sprite.setTint(0xff0000);
    if (this.mobSpawnTimer) this.mobSpawnTimer.destroy();
    this.mobGroup.children.each((mob: any) => {
      mob.setVelocity(0);
      mob.body.enable = false;
      return null;
    });
    this.gameManager.notifyPlayerDeath();
  }

  private handlePlayerBulletHitMob(bullet: any, mob: BaseMob) {
    if (bullet.texture.key === "tnt") {
      this.processExplosion({
        x: bullet.x,
        y: bullet.y,
        damage: bullet.damage,
        radius: bullet.explosionRadius,
      });
      bullet.destroy();
      return;
    }
    mob.takeDamage(bullet.damage || 10);
    bullet.destroy();
  }

  private handleMobBulletHitPlayer(_p: any, bullet: ArrowMob) {
    this.playerObj.takeDamage(bullet.damage, this);
    bullet.destroy();
  }

  private handleSwordHitMob(hitBox: Phaser.GameObjects.Zone, mob: BaseMob) {
    if (mob.getData("hit")) return;
    mob.setData("hit", true);
    mob.takeDamage(hitBox.getData("damage") as number);
  }

  private handleMobHitPlayer(_p: any, mob: BaseMob) {
    this.playerObj.takeDamage(mob.attackDamage, this, mob);
  }

  private processExplosion(data: ExplosionData) {
    const { x, y, damage, radius } = data;
    const distPlayer = Phaser.Math.Distance.Between(
      x,
      y,
      this.playerObj.sprite.x,
      this.playerObj.sprite.y
    );
    if (distPlayer <= radius) {
      this.playerObj.takeDamage(
        Math.floor(damage * (1 - distPlayer / radius)),
        this
      );
    }

    const zone = this.add.zone(x, y, radius * 2, radius * 2);
    this.physics.world.enable(zone);
    (zone.body as Phaser.Physics.Arcade.Body)
      .setCircle(radius)
      .setOffset(-radius, -radius);

    this.physics.overlap(
      zone,
      this.mobGroup,
      (_, mobObj) => {
        const mob = mobObj as BaseMob;
        const d = Phaser.Math.Distance.Between(x, y, mob.x, mob.y);
        if (d <= radius) mob.takeDamage(Math.floor(damage * (1 - d / radius)));
      },
      undefined,
      this
    );

    this.time.delayedCall(100, () => zone.destroy());
    const circle = this.add.circle(x, y, radius * 0.5, 0xff0000, 0.5);
    this.tweens.add({
      targets: circle,
      scale: 1.5,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy(),
    });
  }

  private createDefaultMap(): MapData {
    const rows = 8,
      cols = 12;
    const grid = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) =>
        x === 0 || y === 0 || x === cols - 1 || y === rows - 1
          ? "wall"
          : "grass"
      )
    ) as any;
    return { grid };
  }

  // 在 UIScene 某處
  private startMiniGame() {
    this.gameManager.setPause(true); // 透過你的 GameManager 暫停主遊戲
    this.scene.pause("GameScene");
    this.scene.launch("SlidingPuzzleScene");
  }
}
