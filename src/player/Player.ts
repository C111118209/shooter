import Phaser from "phaser";
import type { IWeaponStrategy } from "../weapons/IWeaponStrategy";

/** 玩家類別 */
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite; // 玩家本體
  public bullets: Phaser.Physics.Arcade.Group; // 子彈或投擲物
  public weaponSprite: Phaser.GameObjects.Image; // 手持武器
  public maxHealth: number = 100; // 最大血量
  public health: number = 100;
  public isDead: boolean = false; // 死亡旗標
  public swordHitBox: Phaser.GameObjects.Zone | null = null; // 劍的近戰判定區
  public isSwinging: boolean = false; // 是否正在揮劍動畫中
  private weapon: IWeaponStrategy;
  public attackDamage: number = 30;

  // -------------------------
  // 升級系統
  // -------------------------
  public level: number = 1;
  public xp: number = 0;
  public xpToNextLevel: number = 5; // 每級需求經驗 = level * 5

  // -------------------------
  // 位置存取
  // -------------------------
  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    initialWeapon: IWeaponStrategy
  ) {
    this.sprite = scene.physics.add.sprite(x, y, texture);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setScale(0.8);

    this.weapon = initialWeapon;

    // 初始化武器 sprite（默認在玩家位置）
    this.weaponSprite = scene.add.image(x, y, "iron_sword"); // 預設使用 iron_sword
    this.weaponSprite.setOrigin(0.1, 0.5); // 握手位置
    this.weaponSprite.setScale(0.4);

    // 子彈群
    this.bullets = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      runChildUpdate: true,
      defaultKey: "arrow",
    });
  }

  // -------------------------
  // 武器
  // -------------------------
  /** 切換武器 */
  public setWeapon(weapon: IWeaponStrategy, weaponKey: string) {
    this.weapon = weapon;
    this.weaponSprite.setTexture(weaponKey);
    this.weaponSprite.setOrigin(weaponKey === "bow" ? 0.1 : 0.1, 0.5);
    this.weaponSprite.setScale(weaponKey === "bow" ? 0.3 : 0.4);
  }

  /** 攻擊 */
  public attack(scene: Phaser.Scene, pointer: Phaser.Input.Pointer) {
    if (this.isDead) return;
    this.weapon.attack(scene, this, pointer);
  }

  // -------------------------
  // 受傷與死亡
  // -------------------------
  public takeDamage(
    dmg: number,
    scene: Phaser.Scene,
    attacker?: Phaser.GameObjects.GameObject
  ) {
    if (this.isDead || this.sprite.getData("isInvuln") || dmg === 0) return;

    this.health -= dmg;
    if (this.health < 0) this.health = 0;

    // 更新 HUD
    scene.events.emit("update-stats", {
      health: this.health,
      maxHealth: this.maxHealth,
      xp: this.xp,
      xpToNextLevel: this.xpToNextLevel,
      level: this.level,
    });

    // 無敵設定
    this.sprite.setData("isInvuln", true);
    this.sprite.setTint(0xdd0000);

    // 推退
    if (attacker) {
      const ax = (attacker as any).x ?? this.sprite.x;
      const ay = (attacker as any).y ?? this.sprite.y;
      const dx = this.sprite.x - ax;
      const dy = this.sprite.y - ay;
      this.sprite.setVelocity(dx * 5, dy * 5);
      scene.time.delayedCall(120, () => this.sprite.setVelocity(0));
    }

    // 無敵結束
    scene.time.delayedCall(500, () => {
      this.sprite.setData("isInvuln", false);
      if (!this.isDead) this.sprite.clearTint();
    });

    // 死亡判定
    if (this.health <= 0) {
      this.isDead = true;
      this.sprite.disableBody(true, true);
      this.weaponSprite.setVisible(false);
      scene.events.emit("player-die");
    }
  }

  // -------------------------
  // 移動
  // -------------------------
  public move(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: any,
    speed: number
  ) {
    if (this.isDead || !this.sprite.active) {
      this.sprite.setVelocity(0);
      return;
    }

    this.sprite.setVelocity(0);
    if (cursors.left?.isDown || wasd.left.isDown)
      this.sprite.setVelocityX(-speed);
    if (cursors.right?.isDown || wasd.right.isDown)
      this.sprite.setVelocityX(speed);
    if (cursors.up?.isDown || wasd.up.isDown) this.sprite.setVelocityY(-speed);
    if (cursors.down?.isDown || wasd.down.isDown)
      this.sprite.setVelocityY(speed);

    this.sprite.body!.velocity.normalize().scale(speed);
  }

  /** 武器旋轉到滑鼠 */
  public updateWeaponRotation(pointer: Phaser.Input.Pointer) {
    if (this.isDead) return;

    this.weaponSprite.setPosition(this.sprite.x, this.sprite.y);

    if (!this.isSwinging) {
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        pointer.worldX,
        pointer.worldY
      );
      this.weaponSprite.setRotation(angle);
    }
  }

  // -------------------------
  // 經驗值 / 升級
  // -------------------------
  /** 增加經驗值 */
  public addXp(amount: number, scene?: Phaser.Scene) {
    this.xp += amount;

    // 判斷升級
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.levelUp(scene);
    }

    // 更新 HUD
    if (scene) {
      scene.events.emit("update-stats", {
        health: this.health,
        maxHealth: this.maxHealth,
        xp: this.xp,
        xpToNextLevel: this.xpToNextLevel,
        level: this.level,
      });
    }
  }

  /** 升級 */
  private levelUp(scene?: Phaser.Scene) {
    this.level += 1;
    this.xpToNextLevel = this.level * 5;

    // 升級時增加基礎屬性
    this.maxHealth += 10;
    this.health = this.maxHealth;
    this.attackDamage += 5;

    // 發送升級事件給 UI
    if (scene) {
      scene.events.emit("player-level-up", { level: this.level });
    }
  }
}
