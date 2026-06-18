import type { EnemyKind } from '@core/enemies/enemy'

/**
 * Time-scheduled enemy spawner. Pure core: a deterministic function of elapsed
 * time. The engine turns due `SpawnEvent`s into actual enemies.
 */
export interface SpawnEvent {
  /** Time in seconds (since spawner start) when this enemy appears. */
  readonly at: number
  readonly kind: EnemyKind
  readonly x: number
  /** Ground level for walkers, or spawn height for flyers. */
  readonly y: number
}

export interface Spawner {
  readonly elapsed: number
  readonly pending: readonly SpawnEvent[]
}

/** Create a spawner from spawn events (sorted by time for predictable order). */
export const createSpawner = (events: readonly SpawnEvent[]): Spawner => ({
  elapsed: 0,
  pending: [...events].sort((a, b) => a.at - b.at),
})

export const isFinished = (s: Spawner): boolean => s.pending.length === 0

export interface SpawnStep {
  readonly spawner: Spawner
  /** Events that came due this step (to be instantiated by the engine). */
  readonly due: readonly SpawnEvent[]
}

/** Advance time by `dt`; return events whose time has arrived, removed from pending. */
export const stepSpawner = (s: Spawner, dt: number): SpawnStep => {
  const elapsed = s.elapsed + dt
  const due = s.pending.filter((e) => e.at <= elapsed)
  const pending = s.pending.filter((e) => e.at > elapsed)
  return { spawner: { elapsed, pending }, due }
}
