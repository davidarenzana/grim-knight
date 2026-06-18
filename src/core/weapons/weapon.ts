import { vec2, type Vec2 } from '@core/math/vector'

/**
 * Weapon / projectile model. Pure core: deterministic, time passed in via `dt`.
 * The lance is the default; other weapons reuse the same shape with different data.
 */
export interface Projectile {
  readonly pos: Vec2
  readonly vel: Vec2
  readonly w: number
  readonly h: number
}

export interface WeaponDef {
  readonly id: string
  /** Horizontal projectile speed in px/s. */
  readonly speed: number
  /** Fire-rate cooldown in seconds. */
  readonly cooldown: number
  /** Maximum simultaneous projectiles on screen. */
  readonly maxOnScreen: number
  readonly w: number
  readonly h: number
}

export interface WeaponState {
  readonly cooldownLeft: number
  readonly projectiles: readonly Projectile[]
}

export interface Bounds {
  readonly minX: number
  readonly maxX: number
}

export const LANCE: WeaponDef = {
  id: 'lance',
  speed: 360,
  cooldown: 0.35,
  maxOnScreen: 2,
  w: 16,
  h: 4,
}

export const createWeapon = (): WeaponState => ({ cooldownLeft: 0, projectiles: [] })

/** Throw a projectile from (originX, originY) toward `facing`, if allowed. */
export const fire = (
  w: WeaponState,
  def: WeaponDef,
  originX: number,
  originY: number,
  facing: 1 | -1,
): WeaponState => {
  if (w.cooldownLeft > 0) return w
  if (w.projectiles.length >= def.maxOnScreen) return w
  const projectile: Projectile = {
    pos: vec2(originX, originY),
    vel: vec2(def.speed * facing, 0),
    w: def.w,
    h: def.h,
  }
  return { cooldownLeft: def.cooldown, projectiles: [...w.projectiles, projectile] }
}

/** Advance projectiles and cooldown by `dt`, culling out-of-bounds projectiles. */
export const stepWeapon = (w: WeaponState, dt: number, bounds: Bounds): WeaponState => {
  const projectiles = w.projectiles
    .map((p) => ({ ...p, pos: vec2(p.pos.x + p.vel.x * dt, p.pos.y + p.vel.y * dt) }))
    .filter((p) => p.pos.x + p.w > bounds.minX && p.pos.x < bounds.maxX)
  return { cooldownLeft: Math.max(0, w.cooldownLeft - dt), projectiles }
}
