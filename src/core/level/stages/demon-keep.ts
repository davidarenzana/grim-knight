import { aabb } from '@core/math/aabb'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, lava, oneWay, PLAYER_START_Y } from '../geometry'
import type { LevelDef } from '../types'

/** Stage 6 — Demon Keep (hell theme). */
export const demonKeep: LevelDef = {
  name: 'Demon Keep',
  theme: 'hell',
  worldWidth: 3400,
  playerStart: { x: 80, y: PLAYER_START_Y },
  solids: [
    ...floor(3400, [
      { x: 980, w: 65 },
      { x: 1480, w: 70 },
      { x: 1980, w: 70 },
      { x: 2700, w: 70 },
    ]),
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
  hazards: [lava(700, 44), lava(1220, 40), lava(2300, 44)],
  spawns: [
    { kind: 'zombie', x: 350, y: GROUND_Y },
    { kind: 'flyer', x: 650, y: 130 },
    { kind: 'plant', x: 900, y: GROUND_Y },
    { kind: 'ogre', x: 1150, y: GROUND_Y },
    { kind: 'zombie', x: 1400, y: GROUND_Y },
    { kind: 'turtle', x: 1650, y: GROUND_Y },
    { kind: 'flyer', x: 1650, y: 110 },
    { kind: 'plant', x: 1900, y: GROUND_Y },
    { kind: 'bloated', x: 2200, y: GROUND_Y },
    { kind: 'ogre', x: 2200, y: GROUND_Y },
    { kind: 'centipede', x: 2500, y: GROUND_Y },
    { kind: 'zombie', x: 2500, y: GROUND_Y },
    { kind: 'flyer', x: 2800, y: 120 },
    { kind: 'ogre', x: 3050, y: GROUND_Y },
    { kind: 'boss', x: 3200, y: GROUND_Y },
  ],
  durationSeconds: 150,
  chests: [
    createChest(620, CHEST_Y),
    createChest(1320, CHEST_Y),
    createChest(2200, CHEST_Y),
    createChest(3000, CHEST_Y),
  ],
}
