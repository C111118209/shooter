import Phaser from "phaser";
import type { IWeaponStrategy } from "../weapons/IWeaponStrategy";
import { ArrowMob } from "../mobs/ArrowMob";

/** 玩家類別 */
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite; // 玩家本體
  public bullets: Phaser.Physics.Arcade.Group; // 子彈或投擲物
  public weaponSprite: Phaser.GameObjects.Image; // 手持武器
  public maxHealth: number = 100; // 新增：最大血量
  public health: number = 100;
  public isDead: boolean = false; // 新增：死亡旗標
  public swordHitBox: Phaser.GameObjects.Zone | null = null; // 新增：劍的近戰判定區
  private weapon: IWeaponStrategy;

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
      classType: ArrowMob,
      runChildUpdate: true,
      defaultKey: "arrow",
    });
  }

  /** 切換武器 */
  public setWeapon(weapon: IWeaponStrategy, weaponKey: string) {
    this.weapon = weapon;
    this.weaponSprite.setTexture(weaponKey);
    // 根據武器調整原點 (例如：劍 0.1, 弓 0.5)
    this.weaponSprite.setOrigin(weaponKey === "bow" ? 0.1 : 0.1, 0.5);
    this.weaponSprite.setScale(weaponKey === "bow" ? 0.3 : 0.4);
  }

  /** 攻擊 */
  public attack(scene: Phaser.Scene, pointer: Phaser.Input.Pointer) {
    if (this.isDead) return;
    this.weapon.attack(scene, this, pointer);
  }

  /** 受傷 */
  public takeDamage(dmg: number, scene: Phaser.Scene) {
    if (this.isDead) return;

    this.health -= dmg;

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.sprite.disableBody(true, true);
      this.weaponSprite.setVisible(false);

      // 觸發遊戲結束畫面（在 GameScene 中實作）
      scene.events.emit("player-die");
    }
  }

  /** 玩家移動 */
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

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      pointer.worldX,
      pointer.worldY
    );
    this.weaponSprite.setPosition(this.sprite.x, this.sprite.y);
    this.weaponSprite.setRotation(angle);
  }
}
