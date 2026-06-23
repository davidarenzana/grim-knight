import { aabb } from '@core/math/aabb'
import { createPlatform } from '@core/physics/platform'
import { createChest } from '../chest'
import { CHEST_Y, floor, GROUND_Y, ledge, oneWay, PLAYER_START_Y, rungs, spikes } from '../geometry'
import type { LevelDef } from '../types'

/**
 * Stage 3 — Swamp Caverns (cave theme).
 *
 * A flat side-scroller with a TWO-LANE choice: the classic ground route, and an
 * elevated "high road" at HIGH_Y that the player may climb a ladder to take
 * instead. The high road is a run of one-way shelves split by un-jumpable gaps
 * the knight bridges on small moving platforms (timing the swing). It's riskier
 * — extra ranged foes patrol it — but rewarding: the better chests sit up there.
 * It rejoins the ground (a free drop onto safe floor) before the boss. Both
 * lanes are visible at once (one-screen tall), so the fork is a real choice.
 */
const HIGH_Y = 150

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
    // High road: three shelves at HIGH_Y with two bridged gaps.
    ledge(460, HIGH_Y, 320), // [460, 780]
    ledge(940, HIGH_Y, 360), // [940, 1300]
    ledge(1480, HIGH_Y, 360), // [1480, 1840]
  ],
  // Ground ladders plus the tall ascent ladder up to the high road.
  ladders: [
    aabb(340, 310, 16, 100),
    aabb(1460, 300, 16, 110),
    aabb(2660, 300, 16, 110),
    rungs(500, HIGH_Y, GROUND_Y), // ground → high road
  ],
  // Small moving platforms bridging the high-road gaps (jump from a shelf edge).
  platforms: [
    createPlatform(786, HIGH_Y, 72, 16, { x: 862, y: HIGH_Y }, 70), // gap [780, 940]
    createPlatform(1306, HIGH_Y, 72, 16, { x: 1402, y: HIGH_Y }, 70), // gap [1300, 1480]
  ],
  // Spikes (not lava): only the hell theme paints hazards as lava — every other
  // theme renders them as spikes (see engine `hazardKey`), so author them as spikes.
  hazards: [spikes(1150, 44), spikes(1890, 44)],
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
    // High-road foes: ranged/stationary so they guard the lane without camping a
    // bridge landing, plus a flyer harassing the shafts between shelves.
    { kind: 'plant', x: 600, y: HIGH_Y },
    { kind: 'turtle', x: 1120, y: HIGH_Y },
    { kind: 'plant', x: 1600, y: HIGH_Y },
    { kind: 'flyer', x: 1000, y: 90 },
  ],
  durationSeconds: 140,
  chests: [
    createChest(560, CHEST_Y), // ground
    createChest(2280, CHEST_Y), // ground
    createChest(700, HIGH_Y - 20), // high-road reward (shelf 1)
    createChest(1650, HIGH_Y - 20), // high-road reward (shelf 3)
  ],
}
