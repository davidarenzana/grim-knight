import type { AABB } from '@core/math/aabb'
import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Body } from '@core/physics/body'

/**
 * Zombie enemy: rises from the ground, then walks toward the player.
 * Pure core: a deterministic function of (enemy, targetX, solids, dt).
 */
export type EnemyState = 'rising' | 'walking' | 'dead'

export interface Enemy {
  readonly body: Body
  readonly hp: number
  readonly state: EnemyState
  readonly facing: 1 | -1
  /** Remaining rise time in seconds. */
  readonly riseTimer: number
}

export const ZOMBIE = {
  speed: 40,
  hp: 1,
  w: 24,
  h: 40,
  gravity: 1500,
  riseSeconds: 0.8,
} as const

/** Spawn a zombie resting on the given ground level (top of the solid). */
export const createZombie = (x: number, groundY: number): Enemy => ({
  body: createBody(x, groundY - ZOMBIE.h, ZOMBIE.w, ZOMBIE.h),
  hp: ZOMBIE.hp,
  state: 'rising',
  facing: -1,
  riseTimer: ZOMBIE.riseSeconds,
})

/** Apply one hit; reaching 0 HP kills the zombie. */
export const hitEnemy = (e: Enemy, damage = 1): Enemy => {
  if (e.state === 'dead') return e
  const hp = e.hp - damage
  return hp <= 0 ? { ...e, hp: 0, state: 'dead' } : { ...e, hp }
}

export const stepZombie = (
  e: Enemy,
  targetX: number,
  solids: readonly AABB[],
  dt: number,
): Enemy => {
  if (e.state === 'dead') return e

  let state = e.state
  let riseTimer = e.riseTimer
  if (state === 'rising') {
    riseTimer = Math.max(0, riseTimer - dt)
    if (riseTimer <= 0) state = 'walking'
  }

  const center = e.body.pos.x + e.body.w / 2
  let facing = e.facing
  let vx = 0
  if (state === 'walking') {
    facing = targetX < center ? -1 : 1
    vx = ZOMBIE.speed * facing
  }

  const body = stepBody({ ...e.body, vel: vec2(vx, e.body.vel.y) }, solids, ZOMBIE.gravity, dt)
  return { ...e, body, state, facing, riseTimer }
}
