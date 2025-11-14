// weapons/SwordStrategy.ts
import Phaser from "phaser";
import type { IWeaponStrategy, IWeaponHolder } from "./IWeaponStrategy";

/** ⚔ 劍：近戰 */
export class SwordStrategy implements IWeaponStrategy {
  private damage: number = 20; // 傷害值
  private swingRate: number = 300; // 揮劍間隔
  private lastSwing: number = 0;

  attack(scene: Phaser.Scene, holder: IWeaponHolder, pointer?: Phaser.Input.Pointer) {
    // 如果已經有攻擊判定區，則等待上次攻擊結束
    if (holder.swordHitBox) return;

    const now = scene.time.now;
    if (now - this.lastSwing < this.swingRate) return;
    this.lastSwing = now;

    // 使用滑鼠指針計算攻擊方向，如果沒有指針則使用預設方向（向右）
    let currentRotation = 0;
    if (pointer) {
      currentRotation = Phaser.Math.Angle.Between(
        holder.x,
        holder.y,
        pointer.worldX,
        pointer.worldY
      );
    }

    const attackDistance = 100; // 攻擊判定區距離玩家的距離

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

    // 2. 創建劍的揮動動畫
    if (holder.weaponSprite) {
      const weaponSprite = holder.weaponSprite;
      const baseRotation = currentRotation;
      const swingAngle = Math.PI / 3; // 揮動角度（60度）
      
      // 標記開始揮動動畫（如果 holder 有 isSwinging 屬性）
      if ('isSwinging' in holder && typeof (holder as any).isSwinging === 'boolean') {
        (holder as any).isSwinging = true;
      }

      // 揮動動畫：先向前揮，再收回
      scene.tweens.add({
        targets: weaponSprite,
        rotation: baseRotation + swingAngle / 2, // 向前揮
        duration: 75,
        ease: "Power2",
        onComplete: () => {
          // 收回動畫
          scene.tweens.add({
            targets: weaponSprite,
            rotation: baseRotation - swingAngle / 2, // 收回
            duration: 75,
            ease: "Power2",
            onComplete: () => {
              // 動畫結束，恢復正常旋轉控制
              if ('isSwinging' in holder && typeof (holder as any).isSwinging === 'boolean') {
                (holder as any).isSwinging = false;
              }
            }
          });
        }
      });

      // 可選：添加輕微的縮放效果（讓揮動更明顯）
      const originalScale = weaponSprite.scaleX;
      scene.tweens.add({
        targets: weaponSprite,
        scaleX: originalScale * 1.1,
        scaleY: originalScale * 1.1,
        duration: 75,
        yoyo: true,
        ease: "Power2"
      });
    }

    // 3. 設置定時器，短暫出現後移除攻擊判定區
    scene.time.delayedCall(150, () => {
      if (holder.swordHitBox) {
        holder.swordHitBox.destroy();
        holder.swordHitBox = null;
      }
    });
  }
}
