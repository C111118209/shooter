// weapons/SwordStrategy.ts
import Phaser from "phaser";
import type { IWeaponStrategy, IWeaponHolder } from "./IWeaponStrategy";

/** ⚔ 劍：近戰 */
export class SwordStrategy implements IWeaponStrategy {
  private damage: number = 40; // 傷害值
  private swingRate: number = 300; // 揮劍間隔
  private lastSwing: number = 0;

  // 移除 pointer 和 target，因為近戰攻擊不需要瞄準，只需要揮動
  attack(scene: Phaser.Scene, holder: IWeaponHolder) {
    // 檢查 holder 是否為 Player (只有 Player 才有 weaponSprite 和 swordHitBox 管理)
    // 為了簡化，我們假設只有玩家使用劍，或者怪物需要自己實作近戰邏輯。
    // 在您的 Player 類別中，`swordHitBox` 是公有屬性，所以我們可以直接使用。

    if (!holder.swordHitBox) return; // 如果已經有攻擊判定區，則等待上次攻擊結束

    const now = scene.time.now;
    if (now - this.lastSwing < this.swingRate) return;
    this.lastSwing = now;

    // 假設 holder.sprite.rotation 已經被 Player.updateWeaponRotation 設置好
    const currentRotation = holder.sprite.rotation;

    // 為了讓怪物也能使用，我們需要一個通用的方式獲取攻擊方向。
    // 對於玩家，我們假設 weaponSprite (或 holder.sprite) 的 rotation 已經設定好。
    const attackDistance = 50; // 固定距離

    // 1. 創建一個近戰判定區 (Zone)
    holder.swordHitBox = scene.add.zone(
      holder.x + Math.cos(currentRotation) * attackDistance,
      holder.y + Math.sin(currentRotation) * attackDistance,
      60, // 寬度
      60 // 高度
    ) as Phaser.GameObjects.Zone;

    scene.physics.world.enable(holder.swordHitBox);
    (holder.swordHitBox.body as Phaser.Physics.Arcade.Body).setAllowGravity(
      false
    );
    (holder.swordHitBox.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    // 設置傷害值
    holder.swordHitBox.setData("damage", this.damage);
    holder.swordHitBox.setData("hit", false); // 避免重複傷害

    // 2. 設置定時器，短暫出現後移除
    scene.time.delayedCall(150, () => {
      if (holder.swordHitBox) {
        holder.swordHitBox.destroy();
        holder.swordHitBox = null;
      }
    });
  }
}
