import { aabb } from '@core/math/aabb'
import { createChest } from '../chest'
import { ledge, spikesOn } from '../geometry'
import type { LevelDef } from '../types'

/**
 * Stage 4 — Iron Fortress (castle theme), a VERTICAL tower.
 *
 * Unlike the side-scrolling stages this one climbs upward: the camera scrolls
 * vertically through a `worldHeight` much taller than the screen. The knight
 * starts on the bottom floor and ascends a zig-zag of one-way ledges joined by
 * ladders to the boss arena at the top. Enemies are gated by `triggerY` (height
 * climbed) instead of `triggerX`, so `triggerX: 0` keeps the horizontal gate
 * open and lets the vertical one decide when each foe wakes.
 *
 * Ledges alternate sides and overlap near a ladder column so each tier is
 * reachable. Stationary/ranged foes (plant, turtle, bloated) sit on the narrow
 * ledges (walkers would stroll off the edge); walkers and the boss take the
 * wide bottom floor and top arena. Flyers harass across the open shafts.
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

/** A ladder spanning from an upper surface down to a lower one (slight overhang). */
const rungs = (x: number, upperY: number, lowerY: number) =>
  aabb(x, upperY - 12, 16, lowerY - upperY + 12)

export const ironFortress: LevelDef = {
  name: 'Iron Fortress',
  theme: 'castle',
  worldWidth: WORLD_W,
  worldHeight: WORLD_H,
  playerStart: { x: 120, y: FLOOR_Y - 48 },
  solids: [
    aabb(0, FLOOR_Y, WORLD_W, 40), // bottom floor (full width)
    ledge(440, T1, 460),
    ledge(0, T2, 560),
    ledge(380, T3, 520),
    ledge(0, T4, 520),
    ledge(400, T5, 500),
    ledge(0, T6, 540),
    ledge(140, ARENA, 680), // boss arena
  ],
  ladders: [
    rungs(480, T1, FLOOR_Y),
    rungs(500, T2, T1),
    rungs(440, T3, T2),
    rungs(440, T4, T3),
    rungs(450, T5, T4),
    rungs(460, T6, T5),
    rungs(300, ARENA, T6),
  ],
  hazards: [
    spikesOn(700, T1, 56),
    spikesOn(120, T2, 56),
    spikesOn(740, T3, 56),
    spikesOn(120, T4, 56),
  ],
  spawns: [
    // Bottom floor — walkers have room here.
    { kind: 'zombie', x: 320, y: FLOOR_Y, triggerX: 0, triggerY: FLOOR_Y },
    { kind: 'ogre', x: 660, y: FLOOR_Y, triggerX: 0, triggerY: FLOOR_Y },
    // Ledges — stationary / ranged foes that won't walk off.
    { kind: 'plant', x: 780, y: T1, triggerX: 0, triggerY: T1 },
    { kind: 'flyer', x: 280, y: 1780, triggerX: 0, triggerY: 1780 },
    { kind: 'turtle', x: 120, y: T2, triggerX: 0, triggerY: T2 },
    { kind: 'plant', x: 780, y: T3, triggerX: 0, triggerY: T3 },
    { kind: 'flyer', x: 600, y: 1320, triggerX: 0, triggerY: 1320 },
    { kind: 'turtle', x: 120, y: T4, triggerX: 0, triggerY: T4 },
    { kind: 'plant', x: 780, y: T5, triggerX: 0, triggerY: T5 },
    { kind: 'flyer', x: 320, y: 840, triggerX: 0, triggerY: 840 },
    { kind: 'bloated', x: 140, y: T6, triggerX: 0, triggerY: T6 },
    // Boss arena at the top.
    { kind: 'ogre', x: 700, y: ARENA, triggerX: 0, triggerY: ARENA },
    { kind: 'boss', x: 460, y: ARENA, triggerX: 0, triggerY: ARENA },
  ],
  durationSeconds: 160,
  chests: [
    createChest(820, T1 - 20),
    createChest(60, T2 - 20),
    createChest(840, T3 - 20),
    createChest(60, T4 - 20),
  ],
}
