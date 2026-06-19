import type { Body, Solid } from '@core/physics/body'

/**
 * Shared ledge-aware walking for ground enemies. Walkers chase the player but
 * must not stroll off a ledge into a pit — so they only step in a direction
 * where there is floor just ahead, turning around (or stopping) at an edge.
 * Pure helpers, used by zombie/ogre/centipede/turtle/boss.
 */

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

/**
 * Ledge-safe direction toward `targetX`. Heads toward the target if there is
 * floor that way; otherwise turns around if the other way has floor; otherwise
 * holds (0). While airborne it doesn't restrict (so it lands normally).
 */
export const chooseDir = (body: Body, targetX: number, solids: readonly Solid[]): -1 | 0 | 1 => {
  const want: 1 | -1 = targetX < body.pos.x + body.w / 2 ? -1 : 1
  if (!body.grounded) return want
  if (groundAhead(body, want, solids)) return want
  if (groundAhead(body, -want as 1 | -1, solids)) return -want as 1 | -1
  return 0
}
