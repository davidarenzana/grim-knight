import { aabb } from '@core/math/aabb'
import { createPlatform } from '@core/physics/platform'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, ledge, lava, oneWay, PLAYER_START_Y, rungs } from '../geometry'
import type { LevelDef } from '../types'

/**
 * Stage 6 — Demon Keep (hell theme).
 *
 * The longest run, with the fullest "high road": climb the ascent ladder onto a
 * four-shelf elevated lane split by three gaps, each bridged on a small moving
 * platform. It's the riskier route (ranged foes patrol it) but carries the best
 * loot; it drops back to the ground before the boss. The ground route is the
 * safe alternative. Both lanes share one screen.
 */
const HIGH_Y = 150

export const demonKeep: LevelDef = {
  name: 'Demon Keep',
  theme: 'hell',
  worldWidth: 3400,
  playerStart: { x: 80, y: PLAYER_START_Y },
  solids: [
    // No pit in the final stretch (≥2050): the boss arena/approach is flat so the
    // fight isn't gated by a jump across its volley (was a soft-lock-ish death trap).
    ...floor(3400, [
      { x: 980, w: 65 },
      { x: 1480, w: 70 },
      { x: 1980, w: 70 },
    ]),
    aabb(450, 360, 40, 50),
    oneWay(700, 300, 180, 20),
    oneWay(1050, 260, 180, 20),
    aabb(1450, 360, 40, 50),
    oneWay(1750, 300, 200, 20),
    oneWay(2150, 260, 180, 20),
    aabb(2550, 360, 40, 50),
    oneWay(2900, 300, 200, 20),
    // High road: four shelves at HIGH_Y with three bridged gaps.
    ledge(510, HIGH_Y, 340), // [510, 850]
    ledge(1010, HIGH_Y, 360), // [1010, 1370]
    ledge(1550, HIGH_Y, 360), // [1550, 1910]
    ledge(2090, HIGH_Y, 360), // [2090, 2450]
  ],
  ladders: [
    aabb(770, 300, 16, 110),
    aabb(1820, 300, 16, 110),
    aabb(2960, 300, 16, 110),
    rungs(550, HIGH_Y, GROUND_Y), // ground → high road
  ],
  platforms: [
    createPlatform(856, HIGH_Y, 72, 16, { x: 932, y: HIGH_Y }, 70), // gap [850, 1010]
    createPlatform(1376, HIGH_Y, 72, 16, { x: 1472, y: HIGH_Y }, 70), // gap [1370, 1550]
    createPlatform(1916, HIGH_Y, 72, 16, { x: 2012, y: HIGH_Y }, 70), // gap [1910, 2090]
  ],
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
    // High-road foes (ranged/stationary) + a flyer between shelves.
    { kind: 'plant', x: 650, y: HIGH_Y },
    { kind: 'turtle', x: 1180, y: HIGH_Y },
    { kind: 'plant', x: 1720, y: HIGH_Y },
    { kind: 'plant', x: 2250, y: HIGH_Y },
    { kind: 'flyer', x: 1100, y: 90 },
  ],
  durationSeconds: 150,
  chests: [
    createChest(620, CHEST_Y), // ground
    createChest(1320, CHEST_Y), // ground
    createChest(3000, CHEST_Y), // ground
    createChest(720, HIGH_Y - 20), // high-road reward (shelf 1)
    createChest(2200, HIGH_Y - 20), // high-road reward (shelf 4)
  ],
}
