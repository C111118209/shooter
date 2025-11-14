// mobs/XpMob.ts
import Phaser from "phaser";
import { BaseMob } from "./BaseMob";

export interface XpMobConfig {
    value: number;      // 經驗值數值
    size?: number;      // 外觀縮放大小
    pickupDistance?: number; // 玩家觸發距離
}

/** ✨ 經驗球 */
export class XpMob extends BaseMob {
    private value: number;
    private pickupDistance: number;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, config: XpMobConfig) {
        super(scene, x, y, texture);

        this.value = config.value;
        this.pickupDistance = config.pickupDistance ?? 100;
        this.setScale(config.size ?? 1);

        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    }

    public updateBehavior() {
        if (!this.target) return;

        const dist = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.target.x, this.target.y
        );

        if (dist <= this.pickupDistance) {
            this.sceneRef.tweens.add({
                targets: this,
                x: this.target!.x,
                y: this.target!.y,
                duration: 200,
                onComplete: () => {
                    this.emit("xp-collected", this.value);
                    this.destroy();
                },
            });
        }
    }
}
