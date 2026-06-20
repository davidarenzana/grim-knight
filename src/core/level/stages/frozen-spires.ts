import { aabb } from '@core/math/aabb'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, oneWay, PLAYER_START_Y, spikes } from '../geometry'
import type { LevelDef } from '../types'

/** Stage 5 — Frozen Spires (ice theme). */
export const frozenSpires: LevelDef = {
  name: 'Frozen Spires',
  theme: 'ice',
  worldWidth: 3000,
  playerStart: { x: 80, y: PLAYER_START_Y },
  solids: [
    ...floor(3000, [
      { x: 1230, w: 70 },
      { x: 1600, w: 70 },
      { x: 2470, w: 70 },
    ]),
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
  hazards: [spikes(1000, 40), spikes(1880, 40)],
  spawns: [
    { kind: 'flyer', x: 400, y: 140 },
    { kind: 'flyer', x: 700, y: 120 },
    { kind: 'zombie', x: 950, y: GROUND_Y },
    { kind: 'plant', x: 1150, y: GROUND_Y },
    { kind: 'turtle', x: 1450, y: GROUND_Y },
    { kind: 'flyer', x: 1750, y: 110 },
    { kind: 'zombie', x: 2050, y: GROUND_Y },
    { kind: 'centipede', x: 2200, y: GROUND_Y },
    { kind: 'plant', x: 2350, y: GROUND_Y },
    { kind: 'flyer', x: 2600, y: 120 },
    { kind: 'boss', x: 2800, y: GROUND_Y },
  ],
  durationSeconds: 140,
  chests: [createChest(580, CHEST_Y), createChest(1120, CHEST_Y), createChest(2420, CHEST_Y)],
}
