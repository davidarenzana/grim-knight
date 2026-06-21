import { aabb } from '@core/math/aabb'
import { createChest } from '../chest'
import { ledge, spikesOn } from '../geometry'
import type { LevelDef } from '../types'

/**
 * Stage 4 — Iron Fortress (castle theme), a VERTICAL tower.
 *
 * Unlike the side-scrolling stages this one climbs upward: the camera scrolls
 * vertically through a `worldHeight` much taller than the screen. The knight
 * starts on the bottom floor and ascends a zig-zag to the boss arena at the
 * top. Enemies are gated by `triggerY` (height climbed) instead of `triggerX`,
 * so `triggerX: 0` keeps the horizontal gate open and the vertical one decides
 * when each foe wakes.
 *
 * Ladders alternate between a LEFT and a RIGHT column so the up-ladder and the
 * down-ladder of a tier never share a column (which would trap the knight where
 * they overlap). You arrive at one column, traverse the shelf — dodging a plant
 * or spikes — and climb the next ladder at the far column. Stationary/ranged
 * foes sit on the shelves (walkers would stroll off); walkers and the boss take
 * the wide bottom floor and top arena; flyers harass across the open shafts.
 */
const WORLD_W = 900
const WORLD_H = 2200
const FLOOR_Y = 2160 // top of the bottom ground band

// Tier surface heights (top y), bottom → top.
const T1 = 1920
const T2 = 1680
const T3 = 1440
const T4 = 1200
const T5 = 960
const T6 = 720
const ARENA = 480

// Each shelf spans this range, covering both ladder columns plus a traverse.
const SHELF_X = 120
const SHELF_W = 660 // [120, 780]
// The two ladder columns. Consecutive ladders alternate between them.
const LCOL = 200
const RCOL = 660

/** A ladder spanning from an upper surface down to a lower one (slight overhang). */
const rungs = (x: number, upperY: number, lowerY: number) =>
  aabb(x, upperY - 12, 16, lowerY - upperY + 12)
/** A standard tower shelf (one-way ledge) at height `y`. */
const shelf = (y: number) => ledge(SHELF_X, y, SHELF_W)

export const ironFortress: LevelDef = {
  name: 'Iron Fortress',
  theme: 'castle',
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,
  playerStart: { x: 120, y: FLOOR_Y - 48 },
  solids: [
    aabb(0, FLOOR_Y, WORLD_W, 40), // bottom floor (full width)
    shelf(T1),
    shelf(T2),
    shelf(T3),
    shelf(T4),
    shelf(T5),
    shelf(T6),
    ledge(120, ARENA, 680), // boss arena [120, 800]
  ],
  ladders: [
    rungs(RCOL, T1, FLOOR_Y), // floor → T1 (right)
    rungs(LCOL, T2, T1), //      T1 → T2 (left)
    rungs(RCOL, T3, T2), //      T2 → T3 (right)
    rungs(LCOL, T4, T3), //      T3 → T4 (left)
    rungs(RCOL, T5, T4), //      T4 → T5 (right)
    rungs(LCOL, T6, T5), //      T5 → T6 (left)
    rungs(RCOL, ARENA, T6), //   T6 → arena (right)
  ],
  // Spikes sit mid-shelf, clear of both ladder columns (200 / 660) and ≤ jump width.
  hazards: [
    spikesOn(500, T1, 56),
    spikesOn(300, T2, 56),
    spikesOn(500, T3, 56),
    spikesOn(300, T4, 56),
  ],
  spawns: [
    // Bottom floor — walkers, between the start and the first ladder.
    { kind: 'zombie', x: 330, y: FLOOR_Y, triggerX: 0, triggerY: FLOOR_Y },
    { kind: 'ogre', x: 500, y: FLOOR_Y, triggerX: 0, triggerY: FLOOR_Y },
    // Shelves — stationary / ranged foes mid-shelf (not on a ladder column).
    { kind: 'plant', x: 420, y: T1, triggerX: 0, triggerY: T1 },
    { kind: 'flyer', x: 430, y: 1800, triggerX: 0, triggerY: 1800 },
    { kind: 'turtle', x: 440, y: T2, triggerX: 0, triggerY: T2 },
    { kind: 'plant', x: 420, y: T3, triggerX: 0, triggerY: T3 },
    { kind: 'flyer', x: 430, y: 1320, triggerX: 0, triggerY: 1320 },
    { kind: 'turtle', x: 440, y: T4, triggerX: 0, triggerY: T4 },
    { kind: 'plant', x: 420, y: T5, triggerX: 0, triggerY: T5 },
    { kind: 'flyer', x: 430, y: 840, triggerX: 0, triggerY: 840 },
    { kind: 'bloated', x: 320, y: T6, triggerX: 0, triggerY: T6 },
    // Boss arena at the top.
    { kind: 'ogre', x: 680, y: ARENA, triggerX: 0, triggerY: ARENA },
    { kind: 'boss', x: 300, y: ARENA, triggerX: 0, triggerY: ARENA },
  ],
  durationSeconds: 160,
  chests: [
    createChest(600, T1 - 20),
    createChest(560, T2 - 20),
    createChest(600, T3 - 20),
    createChest(560, T4 - 20),
  ],
}
