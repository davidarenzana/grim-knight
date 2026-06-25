import mitt from 'mitt'
import type { ArmorState } from '@core/rules/armor'

/**
 * Event bus that decouples the simulation (Phaser/core) from the UI (Vue/Pinia).
 * - The game EMITS `game:*` events that the UI consumes to render the HUD.
 * - The UI EMITS `ui:*` commands that the game consumes (pause, resume, audio).
 *   Start/restart/quit are driven by mounting/unmounting `GameCanvas` (the
 *   `screen` state), not by the bus, so no command event is needed for them.
 * Neither side imports the other directly.
 */

// Single source of truth for the armor states lives in the core.
export type { ArmorState }

export type GameEvents = {
  'game:ready': void
  'game:score-changed': { score: number }
  'game:lives-changed': { lives: number }
  'game:armor-changed': { armor: ArmorState }
  'game:weapon-changed': { weapon: string }
  'game:time-changed': { secondsLeft: number }
  'game:level-changed': { level: number; loop: number }
  'game:boss-hp': { hp: number; maxHp: number }
  'game:boss-cleared': void
  'game:over': { score: number }

  'ui:pause': void
  'ui:resume': void
  /** Audio on/off toggle (the audio adapter mutes its master gain). */
  'ui:audio': { on: boolean }
}

export const bus = mitt<GameEvents>()
