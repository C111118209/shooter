import Phaser from "phaser";
import type { IWeaponStrategy } from "../weapons/IWeaponStrategy";
import { ArrowMob } from "../mobs/ArrowMob";
import { GameManager } from "../core/GameManager";

/** 玩家類別 */
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite; // 玩家本體
  public bullets: Phaser.Physics.Arcade.Group; // 子彈或投擲物
  public weaponSprite: Phaser.GameObjects.Image; // 手持武器
  public maxHealth: number = 100;
  public health: number = 100;
  public isDead: boolean = false;
  public swordHitBox: Phaser.GameObjects.Zone | null = null;
  public isSwinging: boolean = false;
  private weapon: IWeaponStrategy;
  public attackDamage: number = 30;

  // -------------------------
  // 升級系統
  // -------------------------
  public level: number = 1;
  public xp: number = 0;
  public xpToNextLevel: number = 10;

  public moveSpeedBonus: number = 0; // 基礎速度在 GameScene 中定義

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
    this.sprite.setDepth(50); // 確保玩家在牆與地板之上顯示

    this.weapon = initialWeapon;

    this.weaponSprite = scene.add.image(x, y, "iron_sword");
    this.weaponSprite.setOrigin(0.1, 0.5);
    this.weaponSprite.setScale(0.4);
    this.weaponSprite.setDepth(55); // 武器圖層再高一點，避免被牆蓋住

    this.bullets = scene.physics.add.group({
      classType: ArrowMob,
      runChildUpdate: true,
      defaultKey: "arrow",
    });
  }

  // -------------------------
  // 武器
  // -------------------------
  public setWeapon(weapon: IWeaponStrategy, weaponKey: string) {
    this.weapon = weapon;
    this.weaponSprite.setTexture(weaponKey);
    this.weaponSprite.setOrigin(weaponKey === "bow" ? 0.1 : 0.1, 0.5);
    this.weaponSprite.setScale(weaponKey === "bow" ? 0.3 : (weaponKey === 'tnt' ? 0.2 : 0.4));
  }

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

    // 無敵與紅色受傷效果
    this.sprite.setData("isInvuln", true);
    this.sprite.setTint(0xdd0000);

    // 此版本不做額外的擊退，只處理受傷狀態與無敵時間

    scene.time.delayedCall(500, () => {
      this.sprite.setData("isInvuln", false);
      if (!this.isDead) this.sprite.clearTint();
    });

    if (this.health <= 0) {
      this.isDead = true;
      this.sprite.disableBody(true, true);
      this.weaponSprite.setVisible(false);
      // 通過 GameManager 發送玩家死亡事件
      const gameManager = GameManager.getInstance();
      gameManager.notifyPlayerDeath();
    }
  }

  // -------------------------
  // 移動
  // -------------------------
  public move(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: any,
    baseSpeed: number // ⚠️ 接收 GameScene 傳來的基礎速度
  ) {
    if (this.isDead || !this.sprite.active) {
      this.sprite.setVelocity(0);
      return;
    }

    // 🆕 計算最終速度
    const finalSpeed = baseSpeed + this.moveSpeedBonus; // 加上加成

    this.sprite.setVelocity(0);
    if (cursors.left?.isDown || wasd.left.isDown)
      this.sprite.setVelocityX(-finalSpeed); // ⚠️ 使用 finalSpeed
    if (cursors.right?.isDown || wasd.right.isDown)
      this.sprite.setVelocityX(finalSpeed); // ⚠️ 使用 finalSpeed
    if (cursors.up?.isDown || wasd.up.isDown) this.sprite.setVelocityY(-finalSpeed); // ⚠️ 使用 finalSpeed
    if (cursors.down?.isDown || wasd.down.isDown)
      this.sprite.setVelocityY(finalSpeed); // ⚠️ 使用 finalSpeed

    this.sprite.body!.velocity.normalize().scale(finalSpeed);
  }

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
  public addXp(amount: number, scene: Phaser.Scene) {
    this.xp += amount;

    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.levelUp(scene);
    }
  }

  private levelUp(_scene: Phaser.Scene) {
    this.level += 1;
    this.xpToNextLevel = this.level * 10;

    // 通過 GameManager 發送升級事件
    const gameManager = GameManager.getInstance();
    gameManager.notifyPlayerLevelUp({
      level: this.level,
      maxHealth: this.maxHealth,
      attackDamage: this.attackDamage,
    });
  }
}
