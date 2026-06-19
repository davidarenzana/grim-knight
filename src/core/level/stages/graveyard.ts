import { aabb } from '@core/math/aabb'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, oneWay, PLAYER_START_Y, spikes } from '../geometry'
import type { LevelDef } from '../types'

/** Stage 1 — Graveyard (ruins theme). */
export const graveyard: LevelDef = {
  name: 'Graveyard',
  theme: 'ruins',
  worldWidth: 2800,
  playerStart: { x: 80, y: PLAYER_START_Y },
  solids: [
    ...floor(2800, [
      { x: 1075, w: 75 },
      { x: 1780, w: 75 },
      { x: 2330, w: 70 },
    ]),
    oneWay(300, 320, 160, 20),
    aabb(620, 360, 40, 50), // jumpable crate
    oneWay(900, 300, 200, 20),
    oneWay(1500, 320, 180, 20),
    aabb(1900, 360, 40, 50),
    oneWay(2250, 300, 200, 20),
  ],
  ladders: [aabb(360, 320, 16, 90), aabb(980, 300, 16, 110), aabb(2330, 300, 16, 110)],
  hazards: [spikes(690, 40), spikes(2050, 40)],
  spawns: [
    { kind: 'zombie', x: 280, y: GROUND_Y },
    { kind: 'plant', x: 470, y: GROUND_Y },
    { kind: 'flyer', x: 760, y: 120 },
    { kind: 'zombie', x: 1000, y: GROUND_Y },
    { kind: 'centipede', x: 1200, y: GROUND_Y },
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
}
