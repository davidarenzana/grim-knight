import { aabb, type AABB } from '@core/math/aabb'
import type { Solid } from '@core/physics/body'

/**
 * Shared stage-geometry building blocks (pure). Stage modules under `stages/`
 * compose their layout from these helpers so every level uses the same ground
 * line, jump tuning and hazard sizing.
 */

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

/** A spike strip sitting on the ground surface (contact hazard you jump over). */
export const spikes = (x: number, w: number): AABB => aabb(x, GROUND_Y - 16, w, 16)
/** A lava pool band on the ground surface (contact hazard). */
export const lava = (x: number, w: number): AABB => aabb(x, GROUND_Y - 12, w, 12)
