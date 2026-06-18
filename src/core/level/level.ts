import type { AABB } from '@core/math/aabb'
import { aabb } from '@core/math/aabb'
import type { Solid } from '@core/physics/body'
import type { SpawnEvent } from './spawner'

/**
 * Static level definition (pure data). The engine reads it to build a stage:
 * geometry, ladders, the spawn wave, the world width (for camera scroll) and the
 * stage timer. Levels are wider than the screen so the camera scrolls.
 */
export interface LevelDef {
  readonly name: string
  /** World width in px (≥ screen width); the camera scrolls within it. */
  readonly worldWidth: number
  readonly playerStart: { readonly x: number; readonly y: number }
  readonly solids: readonly Solid[]
  readonly ladders: readonly AABB[]
  readonly spawns: readonly SpawnEvent[]
  readonly durationSeconds: number
}

const GROUND_Y = 410
const GROUND_H = 40
const PLAYER_START_Y = 362 // GROUND_Y - player height (48)

const oneWay = (x: number, y: number, w: number, h: number): Solid => ({
  ...aabb(x, y, w, h),
  oneWay: true,
})

export const LEVELS: readonly LevelDef[] = [
  {
    name: 'Graveyard',
    worldWidth: 1600,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 1600, GROUND_H),
      oneWay(300, 320, 160, 20),
      aabb(620, 360, 40, 50), // jumpable crate
      oneWay(900, 300, 200, 20),
    ],
    ladders: [aabb(360, 320, 16, 90), aabb(980, 300, 16, 110)],
    spawns: [
      { at: 0.5, kind: 'zombie', x: 280, y: GROUND_Y },
      { at: 1.5, kind: 'flyer', x: 760, y: 120 },
      { at: 2.5, kind: 'plant', x: 470, y: GROUND_Y },
      { at: 3.5, kind: 'zombie', x: 1000, y: GROUND_Y },
      { at: 5.0, kind: 'ogre', x: 1250, y: GROUND_Y },
      { at: 6.5, kind: 'flyer', x: 1450, y: 100 },
      { at: 9.0, kind: 'boss', x: 1400, y: GROUND_Y },
    ],
    durationSeconds: 99,
  },
  {
    name: 'Haunted Forest',
    worldWidth: 1800,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 1800, GROUND_H),
      oneWay(260, 300, 180, 20),
      oneWay(560, 250, 160, 20),
      aabb(820, 360, 40, 50),
      oneWay(1100, 300, 200, 20),
    ],
    ladders: [aabb(320, 300, 16, 110), aabb(1160, 300, 16, 110)],
    spawns: [
      { at: 0.5, kind: 'flyer', x: 500, y: 140 },
      { at: 1.5, kind: 'plant', x: 600, y: GROUND_Y },
      { at: 2.5, kind: 'zombie', x: 900, y: GROUND_Y },
      { at: 3.5, kind: 'flyer', x: 1300, y: 110 },
      { at: 5.0, kind: 'ogre', x: 1400, y: GROUND_Y },
      { at: 6.5, kind: 'plant', x: 1500, y: GROUND_Y },
      { at: 9.0, kind: 'boss', x: 1600, y: GROUND_Y },
    ],
    durationSeconds: 99,
  },
]
