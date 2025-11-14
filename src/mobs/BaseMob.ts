// baseMob.ts
import Phaser from "phaser";
import type { Player } from "../player/Player";
import type {
  IWeaponHolder,
  IWeaponStrategy,
} from "../weapons/IWeaponStrategy";
import { ArrowMob } from "./ArrowMob";
import type GameScene from "../scenes/GameScene";

/**
 * 🧱 BaseMob：所有怪物的基底類別
 */
export abstract class BaseMob
  extends Phaser.Physics.Arcade.Sprite
  implements IWeaponHolder {
  public hp: number = 100;
  public speed: number = 50;
  public attackDamage: number = 5;
  protected target?: Player;
  protected sceneRef: Phaser.Scene;

  // 🆕 武器相關屬性
  protected weaponStrategy: IWeaponStrategy | null = null;
  public bullets: Phaser.Physics.Arcade.Group; // 武器策略需要
  public swordHitBox: Phaser.GameObjects.Zone | null = null; // 武器策略需要 (近戰判定區)

  // 🆕 新增：怪物的武器視覺物件
  public weaponSprite: Phaser.GameObjects.Image | null = null;

  public get sprite(): Phaser.Physics.Arcade.Sprite {
    return this;
  }

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, damage = 5) {
    super(scene, x, y, texture);

    this.sceneRef = scene;
    this.attackDamage = damage;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.setScale(0.7);

    // 初始化子彈群組 (專用於 Mob)
    this.bullets = scene.physics.add.group({
      classType: ArrowMob,
      runChildUpdate: true,
      defaultKey: "arrow",
    });
  }

  /** 設置武器，同時創建並設定武器 Sprite */
  public setWeapon(weapon: IWeaponStrategy, weaponKey?: string) {
    this.weaponStrategy = weapon;

    // 🆕 創建武器 Sprite
    if (weaponKey) {
      if (this.weaponSprite) {
        this.weaponSprite.destroy(); // 銷毀舊的
      }
      this.weaponSprite = this.sceneRef.add.image(this.x, this.y, weaponKey);
      this.weaponSprite.setOrigin(0.1, 0.5); // 握手位置
      this.weaponSprite.setScale(weaponKey === "bow" ? 0.3 : 0.4);
    } else if (this.weaponSprite) {
      this.weaponSprite.setVisible(false);
    }
  }

  /** 使用武器攻擊 (通常由 updateBehavior 調用) */
  protected attack() {
    if (this.weaponStrategy && this.target) {
      this.weaponStrategy.attack(this.sceneRef, this, undefined, this.target);
    }
  }

  /** 🆕 武器旋轉到目標 */
  public updateWeaponRotation() {
    if (!this.target || !this.weaponSprite) return;

    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );

    // 武器位置跟隨怪物本體
    this.weaponSprite.setPosition(this.x, this.y);
    this.weaponSprite.setRotation(angle);
  }

  /** 綁定玩家對象，作為目標 */
  public setTarget(player: Player) {
    this.target = player;
  }

  /** 行為更新（預設為追擊玩家） */
  public updateBehavior() {
    if ((this.scene as GameScene).isPaused || !this.target) return;

    // 如果持有武器，更新武器旋轉
    if (this.weaponSprite) {
      this.updateWeaponRotation();
    }

    this.sceneRef.physics.moveToObject(this, this.target, this.speed);
  }

  /** 承受傷害 */
  public takeDamage(dmg: number) {
    this.hp -= dmg;

    this.setTint(0xdd0000);
    this.sceneRef.time.delayedCall(100, () => {
      this.clearTint()
      this.setData("hit", false);
    });

    if (this.hp <= 0) {
      // 銷毀武器 Sprite
      if (this.weaponSprite) {
        this.weaponSprite.destroy();
      }
      this.emit("mob-die", this);
      this.destroy();
    }
  }
}
