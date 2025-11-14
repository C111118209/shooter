import Phaser from "phaser";
import type { IWeaponStrategy, IWeaponHolder } from "./IWeaponStrategy";
import type { BaseMob } from "../mobs/BaseMob";
import type { Player } from "../player/Player";
import { ArrowMob } from "../mobs/ArrowMob";

export class BowStrategy implements IWeaponStrategy {
  private defaultDamage: number = 20;
  private fireRate: number = 500;
  private lastFired: number = 0;

  attack(
    scene: Phaser.Scene,
    holder: IWeaponHolder,
    pointer?: Phaser.Input.Pointer,
    target?: BaseMob | Player
  ) {
    const now = scene.time.now;
    if (now - this.lastFired < this.fireRate) return;
    this.lastFired = now;

    // 計算發射角度來源與目標
    const startX = holder.x;
    const startY = holder.y;

    let targetX: number, targetY: number;
    if (target) {
      // 給怪物或 AI 使用（自動鎖定）
      targetX = target.x;
      targetY = target.y;
    } else if (pointer) {
      // 給玩家使用（滑鼠指向）
      targetX = pointer.worldX;
      targetY = pointer.worldY;
    } else {
      return; // 沒有目標或滑鼠就不射
    }

    // 從群組中取得一支箭（或生成新的）
    const arrow = holder.bullets.get() as ArrowMob;
    if (!arrow) return;

    arrow.fire(startX, startY, targetX, targetY, holder.attackDamage ?? this.defaultDamage);
  }
}
