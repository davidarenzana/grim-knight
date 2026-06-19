import { vec2 } from '@core/math/vector'
import { createBody } from '@core/physics/body'
import type { Projectile } from '@core/weapons/weapon'
import type { Enemy, EnemyTarget } from './enemy'

/**
 * Big bloated: a stationary caster that lobs an arcing bolt toward the player
 * (area denial). The bolt is launched upward and falls under its own `ay`, so it
 * drops onto the player from above. Cadence derived from `age` — pure.
 */
export const BLOATED = {
  hp: 2,
  w: 36,
  h: 40,
  fireInterval: 2.6,
  projectileSpeed: 150,
  launchVy: -260,
  projectileAy: 700,
  projW: 12,
  projH: 12,
} as const

export const createBloated = (x: number, groundY: number): Enemy => ({
  kind: 'bloated',
  body: createBody(x, groundY - BLOATED.h, BLOATED.w, BLOATED.h),
  hp: BLOATED.hp,
  state: 'walking', // "active"; the bloated does not move
  facing: -1,
  riseTimer: 0,
  age: 0,
})

export interface BloatedStep {
  readonly enemy: Enemy
  readonly fired: readonly Projectile[]
}

export const stepBloated = (e: Enemy, target: EnemyTarget, dt: number): BloatedStep => {
  if (e.state === 'dead') return { enemy: e, fired: [] }

  const age = e.age + dt
  const cx = e.body.pos.x + e.body.w / 2
  const cy = e.body.pos.y + e.body.h / 2
  const facing: 1 | -1 = target.x < cx ? -1 : 1

  const crossed = Math.floor(age / BLOATED.fireInterval) > Math.floor(e.age / BLOATED.fireInterval)
  const fired: Projectile[] = crossed
    ? [
        {
          pos: vec2(cx - BLOATED.projW / 2, cy - BLOATED.projH / 2),
          vel: vec2(BLOATED.projectileSpeed * facing, BLOATED.launchVy),
          ay: BLOATED.projectileAy,
          w: BLOATED.projW,
          h: BLOATED.projH,
        },
      ]
    : []

  return { enemy: { ...e, facing, age }, fired }
}
