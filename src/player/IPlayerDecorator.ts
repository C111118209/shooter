// src/player/IPlayerDecorator.ts (新檔案)

import { Player } from "./Player";

/**
 * 裝飾器介面
 */
export interface IPlayerDecorator {
    apply(): void;
}

/**
 * 具體的裝飾器：增加最大血量
 */
export class HealthBoostDecorator implements IPlayerDecorator {
    private player: Player

    constructor(player: Player) {
        this.player = player
    }

    apply(): void {
        const boost = Phaser.Math.Between(10, 30);
        this.player.maxHealth += boost;
        this.player.health = Math.min(this.player.health + boost, this.player.maxHealth); // 提升上限並補血
        console.log(`Max Health Boost: +${boost}`);
    }
}

/**
 * 具體的裝飾器：立即恢復血量
 */
export class HealingDecorator implements IPlayerDecorator {
    private player: Player

    constructor(player: Player) {
        this.player = player
    }

    apply(): void {
        const healAmount = Phaser.Math.Between(10, 50);
        this.player.health = Math.min(
            this.player.health + healAmount,
            this.player.maxHealth
        );
        console.log(`Healing: +${healAmount}`);
    }
}

/**
 * 具體的裝飾器：增加攻擊力
 */
export class DamageBoostDecorator implements IPlayerDecorator {
    private player: Player

    constructor(player: Player) {
        this.player = player
    }

    apply(): void {
        this.player.attackDamage += 5;
        console.log(`Damage Boost: +5`);
    }
}

/**
 * 具體的裝飾器：增加移動速度
 */
export class SpeedBoostDecorator implements IPlayerDecorator {
    private player: Player

    constructor(player: Player) {
        this.player = player
    }

    // 由於速度在 GameScene.update 中是硬編碼的 (const speed = 200)，
    // 我們需要在 Player 裡新增一個屬性來追蹤這個加成。
    apply(): void {
        this.player.moveSpeedBonus += 20;
        console.log(`Speed Boost: +20`);
    }
}