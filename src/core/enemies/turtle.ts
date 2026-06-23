import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Solid } from '@core/physics/body'
import type { Projectile } from '@core/weapons/weapon'
import type { Enemy, EnemyTarget } from './enemy'
import { advanceDir } from './walk'

/**
 * Battle turtle: a slow, armored walker that advances on the player and fires a
 * straight bullet on a fixed cadence. Combines the ogre's slow walk with the
 * plant's ranged fire. Cadence is derived from `age`, so it stays pure.
 */
export const TURTLE = {
  speed: 16,
  hp: 3,
  w: 40,
  h: 30,
  gravity: 1500,
  fireInterval: 2.2,
  projectileSpeed: 210,
  projW: 14,
  projH: 10,
} as const

export const createTurtle = (x: number, groundY: number): Enemy => ({
  kind: 'turtle',
  body: createBody(x, groundY - TURTLE.h, TURTLE.w, TURTLE.h),
  hp: TURTLE.hp,
  state: 'walking',
  facing: -1,
  riseTimer: 0,
  age: 0,
})

export interface TurtleStep {
  readonly enemy: Enemy
  readonly fired: readonly Projectile[]
}

export const stepTurtle = (
  e: Enemy,
  target: EnemyTarget,
  solids: readonly Solid[],
  dt: number,
): TurtleStep => {
  if (e.state === 'dead') return { enemy: e, fired: [] }

  // Aim at the player always (fires across pits); only move where there's floor.
  const center = e.body.pos.x + e.body.w / 2
  const facing: 1 | -1 = target.x < center ? -1 : 1
  const moveDir = advanceDir(e.body, target.x, solids)
  const body = stepBody(
    { ...e.body, vel: vec2(TURTLE.speed * moveDir * (e.speedScale ?? 1), e.body.vel.y) },
    solids,
    TURTLE.gravity,
    dt,
  )

  const age = e.age + dt
  const crossed = Math.floor(age / TURTLE.fireInterval) > Math.floor(e.age / TURTLE.fireInterval)
  const muzzleX = facing > 0 ? body.pos.x + body.w : body.pos.x - TURTLE.projW
  const muzzleY = body.pos.y + body.h / 2 - TURTLE.projH / 2
  const fired: Projectile[] = crossed
    ? [
        {
          pos: vec2(muzzleX, muzzleY),
          vel: vec2(TURTLE.projectileSpeed * facing, 0),
          w: TURTLE.projW,
          h: TURTLE.projH,
          sprite: 'bullet',
        },
      ]
    : []

  return { enemy: { ...e, body, state: 'walking', facing, age }, fired }
}
