import { vec2 } from '@core/math/vector'
import { createBody } from '@core/physics/body'
import type { Projectile } from '@core/weapons/weapon'
import type { Enemy, EnemyTarget } from './enemy'

/**
 * Plant: a stationary ranged enemy that periodically spits a projectile toward
 * the player. Firing cadence is derived from `age` (no extra state needed), so
 * `stepPlant` stays pure and deterministic.
 */
export const PLANT = {
  hp: 2,
  w: 28,
  h: 32,
  fireInterval: 2.0,
  projectileSpeed: 220,
  projectileW: 12,
  projectileH: 12,
} as const

export const createPlant = (x: number, groundY: number): Enemy => ({
  kind: 'plant',
  body: createBody(x, groundY - PLANT.h, PLANT.w, PLANT.h),
  hp: PLANT.hp,
  state: 'walking', // "active"; the plant does not move
  facing: -1,
  riseTimer: 0,
  age: 0,
})

export interface PlantStep {
  readonly enemy: Enemy
  readonly fired: readonly Projectile[]
}

export const stepPlant = (e: Enemy, target: EnemyTarget, dt: number): PlantStep => {
  if (e.state === 'dead') return { enemy: e, fired: [] }

  const age = e.age + dt
  const cx = e.body.pos.x + e.body.w / 2
  const cy = e.body.pos.y + e.body.h / 2
  const facing: 1 | -1 = target.x < cx ? -1 : 1

  // Fire once each time `age` crosses a multiple of fireInterval.
  const crossed = Math.floor(age / PLANT.fireInterval) > Math.floor(e.age / PLANT.fireInterval)
  const fired: Projectile[] = crossed
    ? [
        {
          pos: vec2(cx - PLANT.projectileW / 2, cy - PLANT.projectileH / 2),
          vel: vec2(PLANT.projectileSpeed * facing, 0),
          w: PLANT.projectileW,
          h: PLANT.projectileH,
        },
      ]
    : []

  return { enemy: { ...e, facing, age }, fired }
}
