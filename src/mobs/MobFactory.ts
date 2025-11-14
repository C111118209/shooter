import Phaser from "phaser";
import { BaseMob } from "./BaseMob";
import { ZombieMob } from "./Zombie";
import { SkeletonMob } from "./Skeleton";
import { CreeperMob } from "./Creeper";
import { SpiderMob } from "./Spider";
import type { Player } from "../player/Player";

/**
 * 🏭 MobFactory：工廠模式實作
 * -----------------------------------------------------
 * 使用「工廠方法模式 (Factory Method Pattern)」集中處理怪物生成邏輯。
 * 優點：
 *  - 呼叫端不需要知道具體類別，只需給出名稱。
 *  - 可輕鬆擴展新怪物類型。
 */
export class MobFactory {
  public static spawn(
    name: string,
    scene: Phaser.Scene,
    pos: { x: number; y: number },
    player: Player
  ): BaseMob {
    let mob: BaseMob;

    switch (name.toLowerCase()) {
      case "zombie":
        mob = new ZombieMob(scene, pos.x, pos.y);
        break;
      case "skeleton":
        mob = new SkeletonMob(scene, pos.x, pos.y);
        break;
      case "creeper":
        mob = new CreeperMob(scene, pos.x, pos.y);
        break;
      case "spider":
        mob = new SpiderMob(scene, pos.x, pos.y);
        break;
      default:
        throw new Error(`未知怪物類型：${name}`);
    }

    mob.setTarget(player);
    return mob;
  }
}
