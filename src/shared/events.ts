import mitt from 'mitt'

/**
 * Event bus that decouples the simulation (Phaser/core) from the UI (Vue/Pinia).
 * - The game EMITS `game:*` events that the UI consumes to render the HUD.
 * - The UI EMITS `ui:*` commands that the game consumes (pause, restart...).
 * Neither side imports the other directly.
 */

/** Knight armor states (classic mechanic: 2 hits). */
export type ArmorState = 'armored' | 'underwear' | 'dead'

export type GameEvents = {
  'game:ready': void
  'game:score-changed': { score: number }
  'game:lives-changed': { lives: number }
  'game:armor-changed': { armor: ArmorState }
  'game:weapon-changed': { weapon: string }
  'game:time-changed': { secondsLeft: number }
  'game:level-changed': { level: number; loop: number }
  'game:over': { score: number }
  'game:won': { score: number }

  'ui:start': { level?: number }
  'ui:pause': void
  'ui:resume': void
  'ui:restart': void
  'ui:quit': void
}

export const bus = mitt<GameEvents>()
