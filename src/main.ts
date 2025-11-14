import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import UIScene from "./scenes/UIScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: "100%",
  height: "100%",
  backgroundColor: "#1e1e1e",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false,
    },
  },
  scene: [GameScene, UIScene],
};

new Phaser.Game(config);
