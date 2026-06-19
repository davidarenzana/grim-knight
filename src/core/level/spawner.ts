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
 * Wake every enemy whose trigger point the player has come within
 * `ACTIVATION_RANGE` of; return them and remove them from `pending`.
 */
export const stepSpawner = (s: Spawner, playerX: number): SpawnStep => {
  const reach = playerX + ACTIVATION_RANGE
  const due = s.pending.filter((e) => triggerOf(e) <= reach)
  const pending = s.pending.filter((e) => triggerOf(e) > reach)
  return { spawner: { pending }, due }
}
