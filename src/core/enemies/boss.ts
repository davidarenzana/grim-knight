import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Solid } from '@core/physics/body'
import type { Projectile } from '@core/weapons/weapon'
import type { BossVariant, Enemy, EnemyTarget } from './enemy'
import { chooseDir } from './walk'

/**
 * Stage bosses: tough walkers that advance on the player and fire a spread on a
 * cadence. There are three escalating variants (one skin per pair of stages),
 * each tougher and with a wider/faster volley. Pure and deterministic. Combat
 * damages them via `hitEnemy`; clearing one (plus the wave) wins the stage.
 */
export interface BossStats {
  readonly hp: number
  readonly w: number
  readonly h: number
  readonly speed: number
  readonly gravity: number
  readonly fireInterval: number
  readonly projectileSpeed: number
  readonly projW: number
  readonly projH: number
  /** Vertical spread offsets for the volley (px/s); one projectile per entry. */
  readonly spread: readonly number[]
}

export const BOSS_VARIANTS: Readonly<Record<BossVariant, BossStats>> = {
  // 1 — "Cyclops Sentinel" (early stages): three-way spread.
  1: {
    hp: 10,
    w: 64,
    h: 80,
    speed: 32,
    gravity: 1500,
    fireInterval: 1.5,
    projectileSpeed: 240,
    projW: 16,
    projH: 16,
    spread: [-90, 0, 90],
  },
  // 2 — mid stages: tankier, faster, five-way burst.
  2: {
    hp: 13,
    w: 64,
    h: 80,
    speed: 30,
    gravity: 1500,
    fireInterval: 1.3,
    projectileSpeed: 280,
    projW: 16,
    projH: 16,
    spread: [-120, -60, 0, 60, 120],
  },
  // 3 — final stages: hardest, rapid five-way fan.
  3: {
    hp: 16,
    w: 64,
    h: 80,
    speed: 36,
    gravity: 1500,
    fireInterval: 1.0,
    projectileSpeed: 300,
    projW: 16,
    projH: 16,
    spread: [-160, -80, 0, 80, 160],
  },
}

/** Default/back-compat stats (variant 1). */
export const BOSS = BOSS_VARIANTS[1]

export const createBoss = (x: number, groundY: number, variant: BossVariant = 1): Enemy => {
  const s = BOSS_VARIANTS[variant]
  return {
    kind: 'boss',
    body: createBody(x, groundY - s.h, s.w, s.h),
    hp: s.hp,
    state: 'walking',
    facing: -1,
    riseTimer: 0,
    age: 0,
    variant,
  }
}

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

  const s = BOSS_VARIANTS[e.variant ?? 1]
  // Aim at the player always; only advance where there's floor (no pit dives).
  const center = e.body.pos.x + e.body.w / 2
  const facing: 1 | -1 = target.x < center ? -1 : 1
  const moveDir = chooseDir(e.body, target.x, solids)
  const body = stepBody(
    { ...e.body, vel: vec2(s.speed * moveDir, e.body.vel.y) },
    solids,
    s.gravity,
    dt,
  )

  const age = e.age + dt
  const crossed = Math.floor(age / s.fireInterval) > Math.floor(e.age / s.fireInterval)
  const muzzleX = facing > 0 ? body.pos.x + body.w : body.pos.x - s.projW
  const muzzleY = body.pos.y + body.h / 2 - s.projH / 2
  const fired: Projectile[] = crossed
    ? s.spread.map((vy) => ({
        pos: vec2(muzzleX, muzzleY),
        vel: vec2(s.projectileSpeed * facing, vy),
        w: s.projW,
        h: s.projH,
      }))
    : []

  return { enemy: { ...e, body, facing, age }, fired }
}
