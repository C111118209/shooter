// weapons/IWeaponStrategy.ts
import Phaser from "phaser";
import type { Player } from "../player/Player";
import type { BaseMob } from "../mobs/BaseMob";

/** 武器裝備者介面 (Weapon Holder) */
export interface IWeaponHolder {
  x: number;
  y: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  bullets: Phaser.Physics.Arcade.Group;
  swordHitBox: Phaser.GameObjects.Zone | null;
  attackDamage?: number;
  weaponSprite: Phaser.GameObjects.Image|null; // 武器視覺物件（用於動畫）
}

/** 武器策略介面 */
export interface IWeaponStrategy {
  attack(
    scene: Phaser.Scene,
    holder: IWeaponHolder,
    pointer?: Phaser.Input.Pointer,
    target?: BaseMob | Player
  ): void;
}
