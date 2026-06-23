import { aabb } from '@core/math/aabb'
import { createPlatform } from '@core/physics/platform'
import { createChest } from '../chest'
import { ledge, rungs, spikesOn } from '../geometry'
import type { LevelDef } from '../types'

/**
 * Stage 2 — Haunted Forest (forest theme), a VERTICAL tower.
 *
 * Like Iron Fortress (stage 4) this one climbs upward instead of side-scrolling:
 * the camera scrolls vertically through a `worldHeight` much taller than the
 * screen. The knight starts at the foot of a haunted canopy and ascends a
 * zig-zag of one-way shelves to the boss arena at the top. It's an earlier,
 * gentler tower than Iron Fortress — shorter (5 climbs vs. 7), with stationary
 * foes and fewer hazards.
 *
 * Enemies are gated by `triggerY` (height climbed) instead of `triggerX`, so
 * `triggerX: 0` keeps the horizontal gate open and the vertical one decides when
 * each foe wakes. Ladders alternate between a LEFT and a RIGHT column so the
 * up-ladder and down-ladder of a tier never share a column (which would trap the
 * knight where they overlap): you arrive at one column, traverse the shelf —
 * dodging a plant or spikes — and climb the next ladder at the far column.
 * Walkers and the boss take the wide bottom floor and top arena; stationary
 * plants sit on the shelves (walkers would stroll off); flyers harass the shafts.
 *
 * The first tier (T1) is the stage's signature mechanic: instead of a solid
 * shelf it is split into a LEFT and a RIGHT ledge with an un-jumpable gap, bridged
 * by a horizontal **moving platform** the knight must time and ride across (it
 * carries him while he stands on it). It's the Haunted Forest's GDD mechanic.
 */
const WORLD_W = 900
const WORLD_H = 1700
const FLOOR_Y = 1660 // top of the bottom ground band

// Tier surface heights (top y), bottom → top.
const T1 = 1420
const T2 = 1180
const T3 = 940
const T4 = 700
const ARENA = 460

// Each shelf spans this range, covering both ladder columns plus a traverse.
const SHELF_X = 120
const SHELF_W = 660 // [120, 780]
// The two ladder columns. Consecutive ladders alternate between them.
const LCOL = 200
const RCOL = 660

// T1 is a split shelf: a left ledge and a right ledge with an un-jumpable gap
// (MAX_JUMP_GAP ≈ 89px) the moving platform bridges. The ladder columns (200 /
// 660) each sit on a different side so both ladders stay reachable.
const T1_LEFT_W = 220 // left ledge [120, 340]
const T1_RIGHT_X = 540
const T1_RIGHT_W = 240 // right ledge [540, 780]

/** A standard tower shelf (one-way ledge) at height `y`. */
const shelf = (y: number) => ledge(SHELF_X, y, SHELF_W)

export const hauntedForest: LevelDef = {
  name: 'Haunted Forest',
  theme: 'forest',
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,
  playerStart: { x: 120, y: FLOOR_Y - 48 },
  solids: [
    aabb(0, FLOOR_Y, WORLD_W, 40), // bottom floor (full width)
    ledge(SHELF_X, T1, T1_LEFT_W), // T1 left ledge [120, 340]
    ledge(T1_RIGHT_X, T1, T1_RIGHT_W), // T1 right ledge [540, 780]
    shelf(T2),
    shelf(T3),
    shelf(T4),
    ledge(120, ARENA, 680), // boss arena [120, 800]
  ],
  // The T1 bridge: a small platform ferrying across the gap at the SAME height as
  // the two ledges, never overlapping them. The knight jumps from a ledge edge
  // onto it and from its edge onto the far ledge; at each extreme it stops a short
  // (jumpable, < MAX_JUMP_GAP ≈ 89px) hop from the near ledge edge.
  platforms: [createPlatform(344, T1, 64, 16, { x: 472, y: T1 }, 70)],
  ladders: [
    rungs(RCOL, T1, FLOOR_Y), // floor → T1 (right)
    rungs(LCOL, T2, T1), //      T1 → T2 (left)
    rungs(RCOL, T3, T2), //      T2 → T3 (right)
    rungs(LCOL, T4, T3), //      T3 → T4 (left)
    rungs(RCOL, ARENA, T4), //   T4 → arena (right)
  ],
  // Spikes sit mid-shelf, clear of both ladder columns (200 / 660). Kept narrow
  // (40px) so they're comfortably jumpable on the cramped tower shelves.
  hazards: [spikesOn(440, T2, 40), spikesOn(440, T3, 40)],
  spawns: [
    // Bottom floor — walkers, between the start and the first ladder.
    { kind: 'zombie', x: 330, y: FLOOR_Y, triggerX: 0, triggerY: FLOOR_Y },
    { kind: 'centipede', x: 520, y: FLOOR_Y, triggerX: 0, triggerY: FLOOR_Y },
    // Shelves — stationary plants mid-shelf (not on a ladder column).
    // T1's plant sits on the right ledge (its mid is now the bridge gap).
    { kind: 'plant', x: 620, y: T1, triggerX: 0, triggerY: T1 },
    { kind: 'flyer', x: 430, y: 1300, triggerX: 0, triggerY: 1300 },
    { kind: 'plant', x: 420, y: T2, triggerX: 0, triggerY: T2 },
    { kind: 'flyer', x: 430, y: 1060, triggerX: 0, triggerY: 1060 },
    { kind: 'plant', x: 420, y: T3, triggerX: 0, triggerY: T3 },
    // Near the top — a heavier walker guards the last climb.
    { kind: 'ogre', x: 500, y: T4, triggerX: 0, triggerY: T4 },
    // Boss arena at the top.
    { kind: 'boss', x: 300, y: ARENA, triggerX: 0, triggerY: ARENA },
  ],
  durationSeconds: 150,
  chests: [createChest(560, T1 - 20), createChest(560, T3 - 20)],
}
