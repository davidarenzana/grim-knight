import type { Body } from '@core/physics/body'

/**
 * Fall-out rule. With pits/gaps in the ground, a body can fall past the bottom
 * of the world; once its top edge drops below `deathY` it has fallen out and the
 * engine treats it as a death (lose a life, respawn). Pure and deterministic.
 */
export const hasFallenOut = (body: Pick<Body, 'pos'>, deathY: number): boolean =>
  body.pos.y > deathY
