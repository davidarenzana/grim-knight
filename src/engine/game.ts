import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'

export const GAME_WIDTH = 800
export const GAME_HEIGHT = 450

/** Creates the Phaser instance inside the given container. */
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1d2b53',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      // Our own physics engine lives in core/. Arcade is kept available in case
      // we delegate broad-phase, but resolution is controlled by the core.
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [GameScene],
  })
}
