import type { Body, Solid } from '@core/physics/body'

/**
 * Shared ledge-aware walking for ground enemies. Walkers never stroll off a
 * ledge into a pit nor press forever into a wall. Two movement styles:
 *  - melee (`patrolDir`): chase the player when close & reachable, otherwise
 *    patrol — keep heading the current way, flipping at a ledge or wall and
 *    carrying on (no freezing/jittering at an edge).
 *  - ranged (`advanceDir`): advance toward the player where there's floor, else
 *    hold position (it keeps firing across the gap; aiming is handled by the
 *    caller's `facing`, which always tracks the player).
 * Pure helpers, used by zombie/ogre/centipede (melee) and turtle/boss (ranged).
 */

/** Horizontal distance within which a melee walker locks onto and chases the player. */
export const AGGRO_RANGE = 200

/** Clearance a ground walker keeps from a ladder column. Walkers treat a ladder
 *  like a wall (plus this buffer) so they never camp the rung a player climbs
 *  out onto — which would otherwise knock the climber off and trap them below. */
export const LADDER_CLEARANCE = 48

/** Is there floor to stand on just ahead of the body in direction `dir`? */
export const groundAhead = (body: Body, dir: 1 | -1, solids: readonly Solid[]): boolean => {
  const footY = body.pos.y + body.h
  const probeX = dir > 0 ? body.pos.x + body.w + 4 : body.pos.x - 4
  // A floor is a solid whose top sits at (or just below) the foot under probeX.
  // Walls/platforms above the foot (s.y well above footY) don't count as floor.
  return solids.some(
    (s) => probeX >= s.x && probeX <= s.x + s.w && s.y >= footY - 4 && s.y <= footY + 24,
  )
}

/** Is there a (non-one-way) wall blocking the body's path just ahead in `dir`? */
export const wallAhead = (body: Body, dir: 1 | -1, solids: readonly Solid[]): boolean => {
  const aheadX = dir > 0 ? body.pos.x + body.w + 2 : body.pos.x - 2
  const midY = body.pos.y + body.h / 2 // mid-height: the floor underfoot never matches
  return solids.some(
    (s) => !s.oneWay && aheadX >= s.x && aheadX <= s.x + s.w && midY >= s.y && midY <= s.y + s.h,
  )
}

/** Is a ladder column just ahead in `dir` (within {@link LADDER_CLEARANCE})? A
 *  ground walker treats it like a wall so it never camps a ladder's exit. */
export const ladderAhead = (
  body: Body,
  dir: 1 | -1,
  ladders: readonly Solid[],
  clearance = LADDER_CLEARANCE,
): boolean => {
  const aheadX = dir > 0 ? body.pos.x + body.w + 2 : body.pos.x - 2
  return ladders.some((l) => aheadX >= l.x - clearance && aheadX <= l.x + l.w + clearance)
}

/** Can the body keep walking one step in `dir` (floor ahead, no wall, and not
 *  onto a ladder column)? Ladders default to none for flat (non-tower) stages. */
export const canStep = (
  body: Body,
  dir: 1 | -1,
  solids: readonly Solid[],
  ladders: readonly Solid[] = [],
): boolean =>
  groundAhead(body, dir, solids) &&
  !wallAhead(body, dir, solids) &&
  !ladderAhead(body, dir, ladders)

/**
 * Melee movement. Chases the player when within {@link AGGRO_RANGE} and there's
 * a clear step that way; otherwise patrols in `facing`, flipping at a ledge or
 * wall and continuing. Returns 0 only when truly boxed in (pits/walls both
 * sides). While airborne it keeps `facing` so it lands normally.
 */
export const patrolDir = (
  body: Body,
  facing: 1 | -1,
  targetX: number,
  solids: readonly Solid[],
  ladders: readonly Solid[] = [],
  aggroRange = AGGRO_RANGE,
): -1 | 0 | 1 => {
  if (!body.grounded) return facing
  const cx = body.pos.x + body.w / 2
  const toward: 1 | -1 = targetX < cx ? -1 : 1
  if (Math.abs(targetX - cx) <= aggroRange && canStep(body, toward, solids, ladders)) return toward
  if (canStep(body, facing, solids, ladders)) return facing
  const back = -facing as 1 | -1
  if (canStep(body, back, solids, ladders)) return back
  return 0
}

/**
 * Ranged movement. Advances toward the player where there's a clear step,
 * otherwise holds position (0) so it doesn't dive into a pit or shove a wall —
 * it keeps firing across the gap. While airborne it heads toward the player.
 */
export const advanceDir = (
  body: Body,
  targetX: number,
  solids: readonly Solid[],
  ladders: readonly Solid[] = [],
): -1 | 0 | 1 => {
  const cx = body.pos.x + body.w / 2
  const toward: 1 | -1 = targetX < cx ? -1 : 1
  if (!body.grounded) return toward
  return canStep(body, toward, solids, ladders) ? toward : 0
}
