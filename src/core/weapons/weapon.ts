import { aabb, intersects } from '@core/math/aabb'
import type { Solid } from '@core/physics/body'
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
  /** Vertical acceleration (gravity) in px/s²; 0 for straight projectiles. */
  readonly ay?: number
  /** Distance travelled so far in px (for limited-reach weapons). */
  readonly traveled?: number
  /** Max travel distance before culling; undefined = unlimited. */
  readonly maxRange?: number
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
  /** Gravity applied to the projectile (arc); 0 or omitted = flat trajectory. */
  readonly gravity?: number
  /** Upward launch velocity in px/s for arcing throws; 0 or omitted = flat. */
  readonly launchVy?: number
  /** Max travel distance before culling (short reach); omitted = unlimited. */
  readonly maxRange?: number
}

export interface WeaponState {
  readonly cooldownLeft: number
  readonly projectiles: readonly Projectile[]
}

export interface Bounds {
  readonly minX: number
  readonly maxX: number
}

/** Straight, fast, reliable default. */
export const LANCE: WeaponDef = {
  id: 'lance',
  speed: 360,
  cooldown: 0.35,
  maxOnScreen: 2,
  w: 16,
  h: 4,
}

/** Fastest fire rate but short reach — high DPS up close. */
export const DAGGER: WeaponDef = {
  id: 'dagger',
  speed: 460,
  cooldown: 0.16,
  maxOnScreen: 3,
  w: 10,
  h: 4,
  maxRange: 150,
}

/** Lobs in an arc, falls under gravity — area denial. */
export const TORCH: WeaponDef = {
  id: 'torch',
  speed: 220,
  cooldown: 0.5,
  maxOnScreen: 2,
  w: 10,
  h: 10,
  gravity: 900,
  launchVy: 220,
}

/** Arcs high to hit elevated foes. */
export const AXE: WeaponDef = {
  id: 'axe',
  speed: 240,
  cooldown: 0.45,
  maxOnScreen: 2,
  w: 12,
  h: 12,
  gravity: 800,
  launchVy: 430,
}

/** Registry of selectable weapons, in cycle order (chests pick from here). */
export const WEAPONS: readonly WeaponDef[] = [LANCE, DAGGER, TORCH, AXE]

/** Resolve a weapon by its id, or undefined if unknown. */
export const weaponById = (id: string): WeaponDef | undefined =>
  WEAPONS.find((wpn) => wpn.id === id)

/** The next weapon in the registry, wrapping around. */
export const nextWeapon = (def: WeaponDef): WeaponDef => {
  const i = WEAPONS.findIndex((wpn) => wpn.id === def.id)
  return WEAPONS[(i + 1) % WEAPONS.length]!
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
    // launchVy is upward (negative y); gravity (ay) pulls it back down.
    vel: vec2(def.speed * facing, -(def.launchVy ?? 0)),
    w: def.w,
    h: def.h,
    ay: def.gravity ?? 0,
    traveled: 0,
    // Only set maxRange when the weapon limits reach (exactOptionalPropertyTypes).
    ...(def.maxRange !== undefined ? { maxRange: def.maxRange } : {}),
  }
  return { cooldownLeft: def.cooldown, projectiles: [...w.projectiles, projectile] }
}

/**
 * Move projectiles by `dt`; cull those out of horizontal bounds or hitting a
 * solid wall. One-way platforms are ignored (projectiles pass through them).
 * Reusable for any projectile list.
 */
export const advanceProjectiles = (
  projectiles: readonly Projectile[],
  dt: number,
  bounds: Bounds,
  solids: readonly Solid[] = [],
): Projectile[] =>
  projectiles
    .map((p) => {
      // Semi-implicit Euler: apply gravity to velocity, then integrate position.
      const vel = vec2(p.vel.x, p.vel.y + (p.ay ?? 0) * dt)
      const pos = vec2(p.pos.x + vel.x * dt, p.pos.y + vel.y * dt)
      const traveled = (p.traveled ?? 0) + Math.hypot(vel.x * dt, vel.y * dt)
      return { ...p, vel, pos, traveled }
    })
    .filter(
      (p) =>
        p.pos.x + p.w > bounds.minX &&
        p.pos.x < bounds.maxX &&
        (p.maxRange === undefined || (p.traveled ?? 0) <= p.maxRange) &&
        !solids.some((s) => !s.oneWay && intersects(aabb(p.pos.x, p.pos.y, p.w, p.h), s)),
    )

/** Advance projectiles and cooldown by `dt`, culling out-of-bounds or wall-hitting projectiles. */
export const stepWeapon = (
  w: WeaponState,
  dt: number,
  bounds: Bounds,
  solids: readonly Solid[] = [],
): WeaponState => ({
  cooldownLeft: Math.max(0, w.cooldownLeft - dt),
  projectiles: advanceProjectiles(w.projectiles, dt, bounds, solids),
})
