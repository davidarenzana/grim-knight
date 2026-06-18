import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Solid } from '@core/physics/body'
import type { Enemy, EnemyTarget } from './enemy'

/**
 * Ogre: a heavy, slow walker with several HP. Like the zombie's walk but no
 * rising and tougher. Pure and deterministic.
 */
export const OGRE = {
  speed: 25,
  hp: 3,
  w: 40,
  h: 56,
  gravity: 1500,
} as const

export const createOgre = (x: number, groundY: number): Enemy => ({
  kind: 'ogre',
  body: createBody(x, groundY - OGRE.h, OGRE.w, OGRE.h),
  hp: OGRE.hp,
  state: 'walking',
  facing: -1,
  riseTimer: 0,
  age: 0,
})

export const stepOgre = (
  e: Enemy,
  target: EnemyTarget,
  solids: readonly Solid[],
  dt: number,
): Enemy => {
  if (e.state === 'dead') return e

  const center = e.body.pos.x + e.body.w / 2
  const facing: 1 | -1 = target.x < center ? -1 : 1
  const vx = OGRE.speed * facing

  const body = stepBody({ ...e.body, vel: vec2(vx, e.body.vel.y) }, solids, OGRE.gravity, dt)
  return { ...e, body, state: 'walking', facing, age: e.age + dt }
}
