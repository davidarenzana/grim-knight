import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Solid } from '@core/physics/body'
import type { Projectile } from '@core/weapons/weapon'
import type { Enemy, EnemyTarget } from './enemy'

/**
 * First boss ("Cyclops Sentinel"): a tough walker that advances on the player
 * and fires a three-way spread on a cadence. Pure and deterministic. Combat
 * damages it via `hitEnemy`; clearing it (plus the wave) wins the stage.
 */
export const BOSS = {
  hp: 10,
  w: 64,
  h: 80,
  speed: 32,
  gravity: 1500,
  fireInterval: 1.5,
  projectileSpeed: 240,
  projW: 16,
  projH: 16,
  /** Vertical spread offsets for the three-way volley (px/s). */
  spread: [-90, 0, 90] as const,
} as const

export const createBoss = (x: number, groundY: number): Enemy => ({
  kind: 'boss',
  body: createBody(x, groundY - BOSS.h, BOSS.w, BOSS.h),
  hp: BOSS.hp,
  state: 'walking',
  facing: -1,
  riseTimer: 0,
  age: 0,
})

export interface BossStep {
  readonly enemy: Enemy
  readonly fired: readonly Projectile[]
}

export const stepBoss = (
  e: Enemy,
  target: EnemyTarget,
  solids: readonly Solid[],
  dt: number,
): BossStep => {
  if (e.state === 'dead') return { enemy: e, fired: [] }

  const center = e.body.pos.x + e.body.w / 2
  const facing: 1 | -1 = target.x < center ? -1 : 1
  const body = stepBody(
    { ...e.body, vel: vec2(BOSS.speed * facing, e.body.vel.y) },
    solids,
    BOSS.gravity,
    dt,
  )

  const age = e.age + dt
  const crossed = Math.floor(age / BOSS.fireInterval) > Math.floor(e.age / BOSS.fireInterval)
  const muzzleX = facing > 0 ? body.pos.x + body.w : body.pos.x - BOSS.projW
  const muzzleY = body.pos.y + body.h / 2 - BOSS.projH / 2
  const fired: Projectile[] = crossed
    ? BOSS.spread.map((vy) => ({
        pos: vec2(muzzleX, muzzleY),
        vel: vec2(BOSS.projectileSpeed * facing, vy),
        w: BOSS.projW,
        h: BOSS.projH,
      }))
    : []

  return { enemy: { ...e, body, facing, age }, fired }
}
