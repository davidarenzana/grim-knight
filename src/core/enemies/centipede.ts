import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Solid } from '@core/physics/body'
import type { Enemy, EnemyTarget } from './enemy'
import { chooseDir } from './walk'

/**
 * Centipede: a fast, low-HP ground crawler that rushes the player. Like the
 * ogre's walk but quick and fragile — a swarm/pressure enemy. Pure and
 * deterministic.
 */
export const CENTIPEDE = {
  speed: 75,
  hp: 1,
  w: 40,
  h: 22,
  gravity: 1500,
} as const

export const createCentipede = (x: number, groundY: number): Enemy => ({
  kind: 'centipede',
  body: createBody(x, groundY - CENTIPEDE.h, CENTIPEDE.w, CENTIPEDE.h),
  hp: CENTIPEDE.hp,
  state: 'walking',
  facing: -1,
  riseTimer: 0,
  age: 0,
})

export const stepCentipede = (
  e: Enemy,
  target: EnemyTarget,
  solids: readonly Solid[],
  dt: number,
): Enemy => {
  if (e.state === 'dead') return e

  const dir = chooseDir(e.body, target.x, solids) // stops/turns at ledges
  const facing = dir !== 0 ? dir : e.facing
  const vx = CENTIPEDE.speed * dir

  const body = stepBody({ ...e.body, vel: vec2(vx, e.body.vel.y) }, solids, CENTIPEDE.gravity, dt)
  return { ...e, body, state: 'walking', facing, age: e.age + dt }
}
