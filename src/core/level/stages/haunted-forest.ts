import { aabb } from '@core/math/aabb'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, oneWay, PLAYER_START_Y, spikes } from '../geometry'
import type { LevelDef } from '../types'

/** Stage 2 — Haunted Forest (forest theme). */
export const hauntedForest: LevelDef = {
  name: 'Haunted Forest',
  theme: 'forest',
  worldWidth: 3000,
  playerStart: { x: 80, y: PLAYER_START_Y },
  solids: [
    ...floor(3000, [
      { x: 690, w: 70 },
      { x: 960, w: 70 },
      { x: 2300, w: 60 },
    ]),
    oneWay(260, 300, 180, 20),
    oneWay(560, 250, 160, 20),
    aabb(820, 360, 40, 50),
    oneWay(1100, 300, 200, 20),
    oneWay(1700, 260, 180, 20),
    aabb(2100, 360, 40, 50),
    oneWay(2500, 300, 200, 20),
  ],
  ladders: [aabb(320, 300, 16, 110), aabb(1160, 300, 16, 110), aabb(2560, 300, 16, 110)],
  hazards: [spikes(1420, 40)],
  spawns: [
    { kind: 'flyer', x: 500, y: 140 },
    { kind: 'plant', x: 600, y: GROUND_Y },
    { kind: 'zombie', x: 900, y: GROUND_Y },
    { kind: 'flyer', x: 1300, y: 110 },
    { kind: 'ogre', x: 1550, y: GROUND_Y },
    { kind: 'plant', x: 1800, y: GROUND_Y },
    { kind: 'centipede', x: 1300, y: GROUND_Y },
    { kind: 'zombie', x: 2100, y: GROUND_Y },
    { kind: 'bloated', x: 2250, y: GROUND_Y },
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
}
