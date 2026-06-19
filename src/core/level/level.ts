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
/** Visual theme of a stage; the engine maps it to ground/background art. */
export type LevelTheme = 'ruins' | 'forest' | 'cave' | 'castle' | 'ice' | 'hell'

export interface LevelDef {
  readonly name: string
  /** Visual theme: selects the ground tile and backdrop (see engine `tiles.ts`). */
  readonly theme: LevelTheme
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
    theme: 'ruins',
    worldWidth: 2800,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 2800, GROUND_H),
      oneWay(300, 320, 160, 20),
      aabb(620, 360, 40, 50), // jumpable crate
      oneWay(900, 300, 200, 20),
      oneWay(1500, 320, 180, 20),
      aabb(1900, 360, 40, 50),
      oneWay(2250, 300, 200, 20),
    ],
    ladders: [aabb(360, 320, 16, 90), aabb(980, 300, 16, 110), aabb(2330, 300, 16, 110)],
    spawns: [
      { kind: 'zombie', x: 280, y: GROUND_Y },
      { kind: 'plant', x: 470, y: GROUND_Y },
      { kind: 'flyer', x: 760, y: 120 },
      { kind: 'zombie', x: 1000, y: GROUND_Y },
      { kind: 'ogre', x: 1350, y: GROUND_Y },
      { kind: 'flyer', x: 1650, y: 100 },
      { kind: 'zombie', x: 1950, y: GROUND_Y },
      { kind: 'plant', x: 2200, y: GROUND_Y },
      { kind: 'ogre', x: 2450, y: GROUND_Y },
      { kind: 'boss', x: 2600, y: GROUND_Y },
    ],
    durationSeconds: 140,
    chests: [
      createChest(500, CHEST_Y, { kind: 'weapon', weaponId: 'dagger' }),
      createChest(940, CHEST_Y, { kind: 'points', points: 500 }),
      createChest(1550, CHEST_Y, { kind: 'armor' }),
      createChest(2280, CHEST_Y, { kind: 'points', points: 750 }),
    ],
  },
  {
    name: 'Haunted Forest',
    theme: 'forest',
    worldWidth: 3000,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 3000, GROUND_H),
      oneWay(260, 300, 180, 20),
      oneWay(560, 250, 160, 20),
      aabb(820, 360, 40, 50),
      oneWay(1100, 300, 200, 20),
      oneWay(1700, 260, 180, 20),
      aabb(2100, 360, 40, 50),
      oneWay(2500, 300, 200, 20),
    ],
    ladders: [aabb(320, 300, 16, 110), aabb(1160, 300, 16, 110), aabb(2560, 300, 16, 110)],
    spawns: [
      { kind: 'flyer', x: 500, y: 140 },
      { kind: 'plant', x: 600, y: GROUND_Y },
      { kind: 'zombie', x: 900, y: GROUND_Y },
      { kind: 'flyer', x: 1300, y: 110 },
      { kind: 'ogre', x: 1550, y: GROUND_Y },
      { kind: 'plant', x: 1800, y: GROUND_Y },
      { kind: 'zombie', x: 2100, y: GROUND_Y },
      { kind: 'flyer', x: 2400, y: 120 },
      { kind: 'ogre', x: 2650, y: GROUND_Y },
      { kind: 'boss', x: 2800, y: GROUND_Y },
    ],
    durationSeconds: 145,
    chests: [
      createChest(520, CHEST_Y, { kind: 'weapon', weaponId: 'torch' }),
      createChest(1180, CHEST_Y, { kind: 'life' }),
      createChest(2080, CHEST_Y, { kind: 'points', points: 750 }),
    ],
  },
  {
    name: 'Swamp Caverns',
    theme: 'cave',
    worldWidth: 2900,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 2900, GROUND_H),
      oneWay(280, 310, 160, 20),
      oneWay(700, 300, 180, 20),
      aabb(1050, 360, 40, 50),
      oneWay(1400, 300, 160, 20),
      oneWay(1850, 320, 180, 20),
      aabb(2250, 360, 40, 50),
      oneWay(2600, 300, 180, 20),
    ],
    ladders: [aabb(340, 310, 16, 100), aabb(1460, 300, 16, 110), aabb(2660, 300, 16, 110)],
    spawns: [
      { kind: 'zombie', x: 300, y: GROUND_Y },
      { kind: 'plant', x: 520, y: GROUND_Y },
      { kind: 'flyer', x: 800, y: 130 },
      { kind: 'zombie', x: 1100, y: GROUND_Y },
      { kind: 'ogre', x: 1400, y: GROUND_Y },
      { kind: 'plant', x: 1700, y: GROUND_Y },
      { kind: 'flyer', x: 2000, y: 120 },
      { kind: 'zombie', x: 2300, y: GROUND_Y },
      { kind: 'ogre', x: 2550, y: GROUND_Y },
      { kind: 'boss', x: 2700, y: GROUND_Y },
    ],
    durationSeconds: 140,
    chests: [
      createChest(560, CHEST_Y, { kind: 'weapon', weaponId: 'axe' }),
      createChest(1080, CHEST_Y, { kind: 'points', points: 750 }),
      createChest(2280, CHEST_Y, { kind: 'armor' }),
    ],
  },
  {
    name: 'Iron Fortress',
    theme: 'castle',
    worldWidth: 3100,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 3100, GROUND_H),
      aabb(500, 360, 40, 50),
      oneWay(750, 300, 200, 20),
      aabb(1150, 360, 40, 50),
      oneWay(1450, 290, 200, 20),
      aabb(1950, 360, 40, 50),
      oneWay(2350, 300, 200, 20),
      aabb(2750, 360, 40, 50),
    ],
    ladders: [aabb(820, 300, 16, 110), aabb(1520, 290, 16, 120), aabb(2420, 300, 16, 110)],
    spawns: [
      { kind: 'ogre', x: 350, y: GROUND_Y },
      { kind: 'zombie', x: 700, y: GROUND_Y },
      { kind: 'plant', x: 950, y: GROUND_Y },
      { kind: 'ogre', x: 1250, y: GROUND_Y },
      { kind: 'flyer', x: 1550, y: 110 },
      { kind: 'plant', x: 1800, y: GROUND_Y },
      { kind: 'zombie', x: 2100, y: GROUND_Y },
      { kind: 'ogre', x: 2400, y: GROUND_Y },
      { kind: 'flyer', x: 2650, y: 110 },
      { kind: 'boss', x: 2900, y: GROUND_Y },
    ],
    durationSeconds: 145,
    chests: [
      createChest(520, CHEST_Y, { kind: 'weapon', weaponId: 'dagger' }),
      // A risky magician chest: opening it curses you back to the lance.
      createChest(1180, CHEST_Y, { kind: 'curse' }),
      createChest(1980, CHEST_Y, { kind: 'armor' }),
      createChest(2780, CHEST_Y, { kind: 'life' }),
    ],
  },
  {
    name: 'Frozen Spires',
    theme: 'ice',
    worldWidth: 3000,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 3000, GROUND_H),
      oneWay(300, 320, 140, 20),
      oneWay(560, 260, 140, 20),
      oneWay(820, 320, 140, 20),
      aabb(1100, 360, 40, 50),
      oneWay(1400, 290, 180, 20),
      oneWay(1800, 320, 140, 20),
      oneWay(2100, 260, 140, 20),
      aabb(2400, 360, 40, 50),
      oneWay(2700, 290, 180, 20),
    ],
    ladders: [aabb(1460, 290, 16, 120), aabb(2760, 290, 16, 120)],
    spawns: [
      { kind: 'flyer', x: 400, y: 140 },
      { kind: 'flyer', x: 700, y: 120 },
      { kind: 'zombie', x: 950, y: GROUND_Y },
      { kind: 'plant', x: 1150, y: GROUND_Y },
      { kind: 'ogre', x: 1450, y: GROUND_Y },
      { kind: 'flyer', x: 1750, y: 110 },
      { kind: 'zombie', x: 2050, y: GROUND_Y },
      { kind: 'plant', x: 2350, y: GROUND_Y },
      { kind: 'flyer', x: 2600, y: 120 },
      { kind: 'boss', x: 2800, y: GROUND_Y },
    ],
    durationSeconds: 140,
    chests: [
      createChest(580, CHEST_Y, { kind: 'weapon', weaponId: 'torch' }),
      createChest(1120, CHEST_Y, { kind: 'armor' }),
      createChest(2420, CHEST_Y, { kind: 'points', points: 1000 }),
    ],
  },
  {
    name: 'Demon Keep',
    theme: 'hell',
    worldWidth: 3400,
    playerStart: { x: 80, y: PLAYER_START_Y },
    solids: [
      aabb(0, GROUND_Y, 3400, GROUND_H),
      aabb(450, 360, 40, 50),
      oneWay(700, 300, 180, 20),
      oneWay(1050, 260, 180, 20),
      aabb(1450, 360, 40, 50),
      oneWay(1750, 300, 200, 20),
      oneWay(2150, 260, 180, 20),
      aabb(2550, 360, 40, 50),
      oneWay(2900, 300, 200, 20),
    ],
    ladders: [aabb(770, 300, 16, 110), aabb(1820, 300, 16, 110), aabb(2960, 300, 16, 110)],
    spawns: [
      { kind: 'zombie', x: 350, y: GROUND_Y },
      { kind: 'flyer', x: 650, y: 130 },
      { kind: 'plant', x: 900, y: GROUND_Y },
      { kind: 'ogre', x: 1150, y: GROUND_Y },
      { kind: 'zombie', x: 1400, y: GROUND_Y },
      { kind: 'flyer', x: 1650, y: 110 },
      { kind: 'plant', x: 1900, y: GROUND_Y },
      { kind: 'ogre', x: 2200, y: GROUND_Y },
      { kind: 'zombie', x: 2500, y: GROUND_Y },
      { kind: 'flyer', x: 2800, y: 120 },
      { kind: 'ogre', x: 3050, y: GROUND_Y },
      { kind: 'boss', x: 3200, y: GROUND_Y },
    ],
    durationSeconds: 150,
    chests: [
      createChest(620, CHEST_Y, { kind: 'weapon', weaponId: 'axe' }),
      createChest(1320, CHEST_Y, { kind: 'life' }),
      createChest(2200, CHEST_Y, { kind: 'armor' }),
      createChest(3000, CHEST_Y, { kind: 'points', points: 1000 }),
    ],
  },
]
