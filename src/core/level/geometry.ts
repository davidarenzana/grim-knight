import { aabb, type AABB } from '@core/math/aabb'
import type { Solid } from '@core/physics/body'
import { GRAVITY, JUMP_IMPULSE, WALK_SPEED } from '@core/fsm/player'

/**
 * Shared stage-geometry building blocks (pure). Stage modules under `stages/`
 * compose their layout from these helpers so every level uses the same ground
 * line, jump tuning and hazard sizing.
 */

/**
 * Maximum horizontal distance a running jump covers, derived from the player
 * tunables: airtime = 2·v/g, distance = walkSpeed·airtime (~89px). A gap or
 * hazard WIDER than this cannot be cleared — landing falls short.
 */
export const MAX_JUMP_GAP = Math.floor((WALK_SPEED * (2 * JUMP_IMPULSE)) / GRAVITY)
/**
 * Comfortable width budget for a ground hazard (spikes/lava). Kept well under
 * {@link MAX_JUMP_GAP} so clearing one never depends on a frame-perfect, edge-of-
 * platform takeoff. Hazards must not exceed this (enforced by a test).
 */
export const SAFE_HAZARD_W = Math.floor(MAX_JUMP_GAP * 0.8)

/** Top of the ground band (world y). */
export const GROUND_Y = 410
/** Height of the ground band. */
export const GROUND_H = 40
/** Player spawn y (GROUND_Y − player height of 48). */
export const PLAYER_START_Y = 362
/** Chest spawn y (rests on the ground). */
export const CHEST_Y = GROUND_Y - 20

/** A semi-solid platform: pass through from below, land on from above. */
export const oneWay = (x: number, y: number, w: number, h: number): Solid => ({
  ...aabb(x, y, w, h),
  oneWay: true,
})

/** Standard thickness of a one-way ledge (the stackable platforms in towers). */
export const LEDGE_H = 20
/** A one-way ledge of standard thickness at (x, y) — the vertical-tower building block. */
export const ledge = (x: number, y: number, w: number): Solid => oneWay(x, y, w, LEDGE_H)

/** A pit (gap in the ground): the player falls through and dies. */
export interface Pit {
  readonly x: number
  readonly w: number
}

/**
 * Build the ground as solid segments covering [0, worldWidth] minus the given
 * pits. Keep pit widths jumpable (≤ ~85px: a jump clears ~90px) so the stage
 * stays passable. The boundary walls are added by the engine.
 */
export const floor = (worldWidth: number, pits: readonly Pit[] = []): Solid[] => {
  const sorted = [...pits].sort((a, b) => a.x - b.x)
  const segments: Solid[] = []
  let cursor = 0
  for (const p of sorted) {
    if (p.x > cursor) segments.push(aabb(cursor, GROUND_Y, p.x - cursor, GROUND_H))
    cursor = Math.max(cursor, p.x + p.w)
  }
  if (cursor < worldWidth) segments.push(aabb(cursor, GROUND_Y, worldWidth - cursor, GROUND_H))
  return segments
}

/** Spike strip whose teeth sit on a surface at top `surfaceY` (contact hazard). */
export const spikesOn = (x: number, surfaceY: number, w: number): AABB =>
  aabb(x, surfaceY - 16, w, 16)
/** A spike strip on the ground surface (contact hazard you jump over). */
export const spikes = (x: number, w: number): AABB => spikesOn(x, GROUND_Y, w)
/**
 * A lava pool set INTO the ground (contact hazard). It fills the ground band
 * with a small lip above the surface, so it reads as a recessed pool rather than
 * a bar floating over the floor. The lip (top above GROUND_Y) is what overlaps a
 * walking player to deal damage, since exact edge contact doesn't count as a hit.
 */
export const lava = (x: number, w: number): AABB => aabb(x, GROUND_Y - 6, w, GROUND_H + 6)
