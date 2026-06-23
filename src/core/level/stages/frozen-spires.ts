import { aabb } from '@core/math/aabb'
import { createPlatform } from '@core/physics/platform'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, ledge, oneWay, PLAYER_START_Y, rungs, spikes } from '../geometry'
import type { LevelDef } from '../types'

/**
 * Stage 5 — Frozen Spires (ice theme).
 *
 * Like Swamp Caverns, a flat run with an optional elevated "high road" at
 * HIGH_Y: climb the ascent ladder and cross a chain of shelves split by gaps
 * bridged on small moving platforms (riskier, with ranged foes, but the better
 * chests are up there), or stay on the ground. The high road drops back to the
 * floor before the boss. Both lanes share one screen, so the fork is a choice.
 */
const HIGH_Y = 150

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
    // High road: three shelves at HIGH_Y with two bridged gaps.
    ledge(480, HIGH_Y, 320), // [480, 800]
    ledge(960, HIGH_Y, 360), // [960, 1320]
    ledge(1500, HIGH_Y, 360), // [1500, 1860]
  ],
  ladders: [
    aabb(1460, 290, 16, 120),
    aabb(2760, 290, 16, 120),
    rungs(520, HIGH_Y, GROUND_Y), // ground → high road
  ],
  platforms: [
    createPlatform(806, HIGH_Y, 72, 16, { x: 882, y: HIGH_Y }, 70), // gap [800, 960]
    createPlatform(1326, HIGH_Y, 72, 16, { x: 1422, y: HIGH_Y }, 70), // gap [1320, 1500]
  ],
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
    // High-road foes (ranged/stationary) + a flyer between shelves.
    { kind: 'plant', x: 620, y: HIGH_Y },
    { kind: 'turtle', x: 1140, y: HIGH_Y },
    { kind: 'plant', x: 1640, y: HIGH_Y },
    { kind: 'flyer', x: 1050, y: 90 },
  ],
  durationSeconds: 140,
  chests: [
    createChest(580, CHEST_Y), // ground
    createChest(2420, CHEST_Y), // ground
    createChest(720, HIGH_Y - 20), // high-road reward (shelf 1)
    createChest(1680, HIGH_Y - 20), // high-road reward (shelf 3)
  ],
}
