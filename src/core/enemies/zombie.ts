import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Solid } from '@core/physics/body'
import type { Enemy, EnemyTarget } from './enemy'
import { onSameLane, patrolDir } from './walk'

/**
 * Zombie: rises from the ground, then walks toward the player.
 * Pure core: a deterministic function of (enemy, target, solids, dt).
 */
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
  kind: 'zombie',
  body: createBody(x, groundY - ZOMBIE.h, ZOMBIE.w, ZOMBIE.h),
  hp: ZOMBIE.hp,
  state: 'rising',
  facing: -1,
  riseTimer: ZOMBIE.riseSeconds,
  age: 0,
})

export const stepZombie = (
  e: Enemy,
  target: EnemyTarget,
  solids: readonly Solid[],
  dt: number,
  ladders: readonly Solid[] = [],
): Enemy => {
  if (e.state === 'dead') return e

  let state = e.state
  let riseTimer = e.riseTimer
  if (state === 'rising') {
    riseTimer = Math.max(0, riseTimer - dt)
    if (riseTimer <= 0) state = 'walking'
  }

  let facing = e.facing
  let vx = 0
  if (state === 'walking') {
    // Chase only when the player shares this walker's lane; else just patrol.
    const dir = patrolDir(e.body, e.facing, target.x, solids, ladders, onSameLane(e.body, target))
    if (dir !== 0) facing = dir
    vx = ZOMBIE.speed * dir * (e.speedScale ?? 1)
  }

  const body = stepBody({ ...e.body, vel: vec2(vx, e.body.vel.y) }, solids, ZOMBIE.gravity, dt)
  return { ...e, body, state, facing, riseTimer, age: e.age + dt }
}
