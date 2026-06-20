import type { Body } from '@core/physics/body'

/**
 * Fall-out rule. With pits/gaps in the ground, a body can fall past the bottom
 * of the world; once its top edge drops below `deathY` it has fallen out and the
 * engine treats it as a death (lose a life, respawn). Pure and deterministic.
 */
export const hasFallenOut = (body: Pick<Body, 'pos'>, deathY: number): boolean =>
  body.pos.y > deathY

/**
 * Safety net for ground enemies that somehow end up wedged below the floor
 * surface (where the player can't reach them, which would block stage-clear): a
 * body has sunk once its top edge drops below `groundY`. No legitimate grounded
 * enemy rests this low (they stand on top of the ground), so the engine treats a
 * sunk enemy as dead. Flyers are exempt (they legitimately hover low).
 */
export const hasSunkUnderFloor = (body: Pick<Body, 'pos'>, groundY: number): boolean =>
  body.pos.y > groundY
