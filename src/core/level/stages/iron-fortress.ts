import { aabb } from '@core/math/aabb'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, oneWay, PLAYER_START_Y, spikes } from '../geometry'
import type { LevelDef } from '../types'

/** Stage 4 — Iron Fortress (castle theme). */
export const ironFortress: LevelDef = {
  name: 'Iron Fortress',
  theme: 'castle',
  worldWidth: 3100,
  playerStart: { x: 80, y: PLAYER_START_Y },
  solids: [
    ...floor(3100, [
      { x: 1010, w: 70 },
      { x: 1620, w: 70 },
      { x: 2170, w: 70 },
    ]),
    aabb(500, 360, 40, 50),
    oneWay(750, 300, 200, 20),
    aabb(1150, 360, 40, 50),
    oneWay(1450, 290, 200, 20),
    aabb(1950, 360, 40, 50),
    oneWay(2350, 300, 200, 20),
    aabb(2750, 360, 40, 50),
  ],
  ladders: [aabb(820, 300, 16, 110), aabb(1520, 290, 16, 120), aabb(2420, 300, 16, 110)],
  hazards: [spikes(840, 40), spikes(1300, 40), spikes(2500, 40)],
  spawns: [
    { kind: 'ogre', x: 350, y: GROUND_Y },
    { kind: 'zombie', x: 700, y: GROUND_Y },
    { kind: 'plant', x: 950, y: GROUND_Y },
    { kind: 'turtle', x: 1150, y: GROUND_Y },
    { kind: 'ogre', x: 1250, y: GROUND_Y },
    { kind: 'flyer', x: 1550, y: 110 },
    { kind: 'plant', x: 1800, y: GROUND_Y },
    { kind: 'turtle', x: 2400, y: GROUND_Y },
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
}
