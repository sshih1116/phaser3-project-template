import Phaser from "phaser";
import Game from "./scenes/game";

const config = {
  type: Phaser.AUTO,
  parent: "blackjack",
  width: 1280,
  height: 780,
  backgroundColor: "#000000",
  scene: [Game],
};

const game = new Phaser.Game(config);
