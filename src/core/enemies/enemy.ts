import type { Body } from '@core/physics/body'

/**
 * Shared enemy model. Every enemy type uses this shape; per-type behavior lives
 * in its own module and is routed by `stepEnemy` (see `index.ts`). Pure core.
 */
export type EnemyKind =
  | 'zombie'
  | 'flyer'
  | 'ogre'
  | 'plant'
  | 'boss'
  | 'centipede'
  | 'turtle'
  | 'bloated'

export type EnemyState = 'rising' | 'walking' | 'flying' | 'dead'

export interface Enemy {
  readonly kind: EnemyKind
  readonly body: Body
  readonly hp: number
  readonly state: EnemyState
  readonly facing: 1 | -1
  /** Remaining rise time in seconds (ground emergers). */
  readonly riseTimer: number
  /** Seconds since spawn, for periodic motion (e.g. flyer sine). */
  readonly age: number
}

/** Where the enemy steers toward (the player center). */
export interface EnemyTarget {
  readonly x: number
  readonly y: number
}

/** Apply one hit; reaching 0 HP kills the enemy. Generic across all kinds. */
export const hitEnemy = (e: Enemy, damage = 1): Enemy => {
  if (e.state === 'dead') return e
  const hp = e.hp - damage
  return hp <= 0 ? { ...e, hp: 0, state: 'dead' } : { ...e, hp }
}
