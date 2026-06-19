import type { AABB } from '@core/math/aabb'
import { aabb } from '@core/math/aabb'
import type { Solid } from '@core/physics/body'
import type { SpawnEvent } from './spawner'
import { createChest, type Chest } from './chest'

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
  /** Optional chests/pickups placed in the stage. */
  readonly chests?: readonly Chest[]
}

const GROUND_Y = 410
const GROUND_H = 40
const PLAYER_START_Y = 362 // GROUND_Y - player height (48)
const CHEST_Y = GROUND_Y - 20 // chest sits on the ground

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
    chests: [
      createChest(500, CHEST_Y, { kind: 'weapon', weaponId: 'dagger' }),
      createChest(940, CHEST_Y, { kind: 'points', points: 500 }),
      createChest(1300, CHEST_Y, { kind: 'armor' }),
    ],
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
    chests: [
      createChest(520, CHEST_Y, { kind: 'weapon', weaponId: 'torch' }),
      createChest(1180, CHEST_Y, { kind: 'life' }),
    ],
  },
  {
    name: 'Swamp Caverns',
    worldWidth: 1700,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 1700, GROUND_H),
      oneWay(280, 310, 160, 20),
      oneWay(700, 300, 180, 20),
      aabb(1050, 360, 40, 50),
      oneWay(1300, 300, 160, 20),
    ],
    ladders: [aabb(340, 310, 16, 100), aabb(1360, 300, 16, 110)],
    spawns: [
      { at: 0.5, kind: 'zombie', x: 300, y: GROUND_Y },
      { at: 1.5, kind: 'plant', x: 520, y: GROUND_Y },
      { at: 2.5, kind: 'flyer', x: 800, y: 130 },
      { at: 3.5, kind: 'zombie', x: 1100, y: GROUND_Y },
      { at: 5.0, kind: 'ogre', x: 1300, y: GROUND_Y },
      { at: 6.5, kind: 'plant', x: 1500, y: GROUND_Y },
      { at: 9.0, kind: 'boss', x: 1500, y: GROUND_Y },
    ],
    durationSeconds: 95,
    chests: [
      createChest(560, CHEST_Y, { kind: 'weapon', weaponId: 'axe' }),
      createChest(1080, CHEST_Y, { kind: 'points', points: 750 }),
    ],
  },
  {
    name: 'Iron Fortress',
    worldWidth: 1900,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 1900, GROUND_H),
      aabb(500, 360, 40, 50),
      oneWay(750, 300, 200, 20),
      aabb(1150, 360, 40, 50),
      oneWay(1450, 290, 200, 20),
    ],
    ladders: [aabb(820, 300, 16, 110), aabb(1520, 290, 16, 120)],
    spawns: [
      { at: 0.5, kind: 'ogre', x: 350, y: GROUND_Y },
      { at: 1.5, kind: 'zombie', x: 700, y: GROUND_Y },
      { at: 2.5, kind: 'plant', x: 950, y: GROUND_Y },
      { at: 3.5, kind: 'ogre', x: 1250, y: GROUND_Y },
      { at: 5.0, kind: 'flyer', x: 1500, y: 110 },
      { at: 6.5, kind: 'plant', x: 1650, y: GROUND_Y },
      { at: 9.0, kind: 'boss', x: 1700, y: GROUND_Y },
    ],
    durationSeconds: 95,
    chests: [
      createChest(520, CHEST_Y, { kind: 'weapon', weaponId: 'dagger' }),
      // A risky magician chest: opening it curses you back to the lance.
      createChest(1180, CHEST_Y, { kind: 'curse' }),
      createChest(1680, CHEST_Y, { kind: 'armor' }),
    ],
  },
  {
    name: 'Frozen Spires',
    worldWidth: 1800,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 1800, GROUND_H),
      oneWay(300, 320, 140, 20),
      oneWay(560, 260, 140, 20),
      oneWay(820, 320, 140, 20),
      aabb(1100, 360, 40, 50),
      oneWay(1400, 290, 180, 20),
    ],
    ladders: [aabb(1460, 290, 16, 120)],
    spawns: [
      { at: 0.5, kind: 'flyer', x: 400, y: 140 },
      { at: 1.5, kind: 'flyer', x: 700, y: 120 },
      { at: 2.5, kind: 'zombie', x: 950, y: GROUND_Y },
      { at: 3.5, kind: 'plant', x: 1150, y: GROUND_Y },
      { at: 5.0, kind: 'ogre', x: 1400, y: GROUND_Y },
      { at: 6.5, kind: 'flyer', x: 1600, y: 110 },
      { at: 9.0, kind: 'boss', x: 1600, y: GROUND_Y },
    ],
    durationSeconds: 90,
    chests: [
      createChest(580, CHEST_Y, { kind: 'weapon', weaponId: 'torch' }),
      createChest(1120, CHEST_Y, { kind: 'armor' }),
    ],
  },
  {
    name: 'Demon Keep',
    worldWidth: 2200,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 2200, GROUND_H),
      aabb(450, 360, 40, 50),
      oneWay(700, 300, 180, 20),
      oneWay(1050, 260, 180, 20),
      aabb(1450, 360, 40, 50),
      oneWay(1750, 300, 200, 20),
    ],
    ladders: [aabb(770, 300, 16, 110), aabb(1820, 300, 16, 110)],
    spawns: [
      { at: 0.5, kind: 'zombie', x: 350, y: GROUND_Y },
      { at: 1.2, kind: 'flyer', x: 650, y: 130 },
      { at: 2.0, kind: 'plant', x: 900, y: GROUND_Y },
      { at: 2.8, kind: 'ogre', x: 1150, y: GROUND_Y },
      { at: 3.6, kind: 'zombie', x: 1400, y: GROUND_Y },
      { at: 4.6, kind: 'flyer', x: 1650, y: 110 },
      { at: 5.6, kind: 'plant', x: 1850, y: GROUND_Y },
      { at: 9.0, kind: 'boss', x: 2000, y: GROUND_Y },
    ],
    durationSeconds: 99,
    chests: [
      createChest(620, CHEST_Y, { kind: 'weapon', weaponId: 'axe' }),
      createChest(1320, CHEST_Y, { kind: 'life' }),
      createChest(1880, CHEST_Y, { kind: 'points', points: 1000 }),
    ],
  },
]
