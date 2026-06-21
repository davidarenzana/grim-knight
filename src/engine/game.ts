import Phaser from 'phaser'
import { GameScene, START_LEVEL_KEY } from './scenes/GameScene'

export const GAME_WIDTH = 800
export const GAME_HEIGHT = 450

/**
 * Creates the Phaser instance inside the given container. `startLevel` is the
 * 0-based stage the run begins at (from the menu's level select; defaults to 0).
 */
export function createGame(parent: HTMLElement, startLevel = 0): Phaser.Game {
  const game = new Phaser.Game({
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
  // Hand the chosen start level to the first GameScene via the game-scoped
  // registry (set synchronously, before the scene boots) instead of a module
  // global.
  game.registry.set(START_LEVEL_KEY, Math.max(0, startLevel))
  return game
}

// Phaser does not hot-reload cleanly: an HMR update to any engine module (this
// file, the scenes, the textures…) leaves a stale, half-updated Phaser.Game that
// looks frozen. Make this a self-accepting HMR boundary that does a full page
// reload instead, so dev edits always restart from a clean game instance.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload()
  })
}
