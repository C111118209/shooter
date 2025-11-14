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
}

/** 武器策略介面 */
// ... (IWeaponStrategy 保持不變)
export interface IWeaponStrategy {
  attack(
    scene: Phaser.Scene,
    holder: IWeaponHolder,
    pointer?: Phaser.Input.Pointer,
    target?: BaseMob | Player
  ): void;
}
