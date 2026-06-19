import { aabb } from '@core/math/aabb'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, lava, oneWay, PLAYER_START_Y } from '../geometry'
import type { LevelDef } from '../types'

/** Stage 3 — Swamp Caverns (cave theme). */
export const swampCaverns: LevelDef = {
  name: 'Swamp Caverns',
  theme: 'cave',
  worldWidth: 2900,
  playerStart: { x: 80, y: PLAYER_START_Y },
  solids: [
    ...floor(2900, [
      { x: 880, w: 70 },
      { x: 1500, w: 70 },
      { x: 2080, w: 70 },
    ]),
    oneWay(280, 310, 160, 20),
    oneWay(700, 300, 180, 20),
    aabb(1050, 360, 40, 50),
    oneWay(1400, 300, 160, 20),
    oneWay(1850, 320, 180, 20),
    aabb(2250, 360, 40, 50),
    oneWay(2600, 300, 180, 20),
  ],
  ladders: [aabb(340, 310, 16, 100), aabb(1460, 300, 16, 110), aabb(2660, 300, 16, 110)],
  hazards: [lava(1150, 60), lava(1890, 60)],
  spawns: [
    { kind: 'zombie', x: 300, y: GROUND_Y },
    { kind: 'plant', x: 520, y: GROUND_Y },
    { kind: 'flyer', x: 800, y: 130 },
    { kind: 'zombie', x: 1100, y: GROUND_Y },
    { kind: 'ogre', x: 1400, y: GROUND_Y },
    { kind: 'centipede', x: 1250, y: GROUND_Y },
    { kind: 'plant', x: 1700, y: GROUND_Y },
    { kind: 'bloated', x: 2300, y: GROUND_Y },
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
}
