import type { EnemyKind } from '@core/enemies/enemy'

/**
 * Position-triggered enemy spawner. Pure core: a deterministic function of the
 * player's progress through the world. An enemy only appears once the player
 * walks within `ACTIVATION_RANGE` of its trigger point — so enemies (and the
 * boss) stay dormant until you approach their zone instead of marching at you
 * from the start of the stage.
 */
export interface SpawnEvent {
  readonly kind: EnemyKind
  /** Spawn position: world x for walkers, x for flyers. */
  readonly x: number
  /** Ground level for walkers, or spawn height for flyers. */
  readonly y: number
  /**
   * World x the player must approach for this enemy to wake. Defaults to the
   * spawn `x`; override to trigger an ambush earlier or later than its position.
   */
  readonly triggerX?: number
  /**
   * World y the player must climb within range of for this enemy to wake. Used
   * by vertical (tower) stages, where progress is upward rather than rightward.
   * When omitted the enemy is gated by x alone (the classic side-scroll rule).
   */
  readonly triggerY?: number
}

/**
 * How close (in px, to the left) the player must get to a trigger point before
 * the enemy spawns. ~480 ≈ one screen-width ahead, so foes pop in just off the
 * right edge of the camera and walk on, never from across the whole stage.
 */
export const ACTIVATION_RANGE = 480

const triggerOf = (e: SpawnEvent): number => e.triggerX ?? e.x

export interface Spawner {
  readonly pending: readonly SpawnEvent[]
}

/** Create a spawner from spawn events (sorted by trigger x for predictable order). */
export const createSpawner = (events: readonly SpawnEvent[]): Spawner => ({
  pending: [...events].sort((a, b) => triggerOf(a) - triggerOf(b)),
})

export const isFinished = (s: Spawner): boolean => s.pending.length === 0

export interface SpawnStep {
  readonly spawner: Spawner
  /** Events the player reached this step (to be instantiated by the engine). */
  readonly due: readonly SpawnEvent[]
}

/**
 * Has the player reached this event's trigger? Always gated on x (approaching
 * from the left, as in a side-scroller). Events that also set `triggerY` add a
 * vertical gate so tower stages wake foes as the player climbs up to them —
 * `playerY` shrinks as the knight ascends, so "within range below" means
 * `playerY − triggerY ≤ range`.
 */
const reached = (e: SpawnEvent, playerX: number, playerY: number, range: number): boolean => {
  if (triggerOf(e) > playerX + range) return false
  if (e.triggerY !== undefined && playerY - e.triggerY > range) return false
  return true
}

/**
 * Wake every enemy whose trigger point the player has come within
 * `ACTIVATION_RANGE` of; return them and remove them from `pending`. `playerY`
 * is only consulted for events with a `triggerY` (vertical stages); omit it for
 * classic horizontal levels.
 */
export const stepSpawner = (s: Spawner, playerX: number, playerY = 0): SpawnStep => {
  const due = s.pending.filter((e) => reached(e, playerX, playerY, ACTIVATION_RANGE))
  const pending = s.pending.filter((e) => !reached(e, playerX, playerY, ACTIVATION_RANGE))
  return { spawner: { pending }, due }
}
