// weapons/TNTStrategy.ts
import Phaser from "phaser";
import type { IWeaponStrategy, IWeaponHolder } from "./IWeaponStrategy";
import type { BaseMob } from "../mobs/BaseMob";
import type { Player } from "../player/Player";

/** 💣 TNT：投擲爆炸，冷卻 */
export class TNTStrategy implements IWeaponStrategy {
  private damage: number = 50; // 爆炸基礎傷害
  private explosionRadius: number = 100; // 爆炸半徑
  private lastThrow: number = 0;
  private cooldown: number = 3000; // 3 秒冷卻

  attack(
    scene: Phaser.Scene,
    holder: IWeaponHolder,
    pointer?: Phaser.Input.Pointer,
    target?: BaseMob | Player
  ) {
    const now = scene.time.now;
    if (now - this.lastThrow < this.cooldown) return; // 冷卻中
    this.lastThrow = now;

    let targetX, targetY;

    if (target) {
      targetX = target.x;
      targetY = target.y;
    } else if (pointer) {
      targetX = pointer.worldX;
      targetY = pointer.worldY;
    } else {
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      holder.x,
      holder.y,
      targetX,
      targetY
    );

    const tnt = holder.bullets.get(
      holder.x,
      holder.y,
      "tnt"
    ) as Phaser.Physics.Arcade.Image & {
      damage?: number;
      explosionRadius?: number;
    };

    if (tnt) {
      tnt.setActive(true).setVisible(true);
      tnt.setRotation(angle);
      tnt.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);
      tnt.setScale(0.2);
      tnt.setSize(12, 12)

      // 設置爆炸屬性
      tnt.damage = this.damage;
      tnt.explosionRadius = this.explosionRadius;

      // 改為: 設置一個最大存活時間，防止 TNT 永遠飛下去
      // 例如 5 秒後自動爆炸並銷毀 (可選)
      scene.time.delayedCall(5000, () => {
        if (tnt.active) {
          // 避免重複爆炸
          tnt.emit("explode", tnt);
          tnt.destroy();
        }
      });
    }
  }
}
