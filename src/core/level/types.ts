import type { AABB } from '@core/math/aabb'
import type { Solid } from '@core/physics/body'
import type { Platform } from '@core/physics/platform'
import type { SpawnEvent } from './spawner'
import type { Chest } from './chest'

/**
 * Static level definition (pure data). The engine reads it to build a stage:
 * geometry, ladders, the spawn wave, the world width (for camera scroll) and the
 * stage timer. Levels are wider than the screen so the camera scrolls.
 */

/** Visual theme of a stage; the engine maps it to ground/background art. */
export type LevelTheme = 'ruins' | 'forest' | 'cave' | 'castle' | 'ice' | 'hell'

export interface LevelDef {
  readonly name: string
  /** Visual theme: selects the ground tile and backdrop (see engine `tiles.ts`). */
  readonly theme: LevelTheme
  /** World width in px (≥ screen width); the camera scrolls within it. */
  readonly worldWidth: number
  /**
   * World height in px. Defaults to the screen height (one-screen-tall, classic
   * side-scroller). Set larger than the screen for a vertical (tower) stage the
   * camera scrolls up through.
   */
  readonly worldHeight?: number
  readonly playerStart: { readonly x: number; readonly y: number }
  readonly solids: readonly Solid[]
  readonly ladders: readonly AABB[]
  /** Optional kinematic platforms the knight can ride between zones. */
  readonly platforms?: readonly Platform[]
  readonly spawns: readonly SpawnEvent[]
  readonly durationSeconds: number
  /** Optional chests/pickups placed in the stage. */
  readonly chests?: readonly Chest[]
  /** Optional damaging zones (spikes/lava) that hurt the player on contact. */
  readonly hazards?: readonly AABB[]
}
