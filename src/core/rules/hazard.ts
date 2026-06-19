import { intersects, type AABB } from '@core/math/aabb'

/**
 * Static stage hazards (spikes, lava). A hazard is just an AABB; the player
 * takes a hit while overlapping any of them. Pure predicate — the engine folds
 * the result into the player's `damaged` input, so i-frames/knockback are
 * handled by the armor FSM exactly like an enemy hit.
 */
export const touchesHazard = (playerBox: AABB, hazards: readonly AABB[]): boolean =>
  hazards.some((h) => intersects(playerBox, h))
