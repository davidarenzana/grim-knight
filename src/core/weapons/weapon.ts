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
  /**
   * Presentation tag selecting the projectile's art (e.g. enemy shots: 'fire',
   * 'bolt', 'spore', 'bullet'). Pure data; the engine maps it to a sprite and
   * falls back to a rectangle when absent/unknown.
   */
  readonly sprite?: string
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

/**
 * The next weapon among the ones the player OWNS (by id), wrapping around. The
 * knight starts with only a couple and earns the rest from chests, so swapping
 * cycles just the owned set — not the whole registry.
 */
export const nextOwnedWeapon = (currentId: string, owned: readonly string[]): WeaponDef => {
  const defs = owned.map(weaponById).filter((d): d is WeaponDef => d !== undefined)
  if (defs.length === 0) return weaponById(currentId) ?? DAGGER
  const i = defs.findIndex((d) => d.id === currentId)
  return defs[(i + 1) % defs.length]!
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

/** Why a projectile was removed this step (the engine sparks on `wall`). */
export type CullReason = 'wall' | 'bounds' | 'range'

export interface ProjectileCull {
  readonly projectile: Projectile
  readonly reason: CullReason
}

export interface AdvanceResult {
  /** Projectiles that survived the step (already moved). */
  readonly alive: Projectile[]
  /** Projectiles removed this step, with the reason, at their last position. */
  readonly culled: ProjectileCull[]
}

/**
 * Move projectiles by `dt` and partition them into survivors and culled (with a
 * reason: out of horizontal bounds, past max range, or hit a solid wall; one-way
 * platforms are ignored). The detailed form lets the engine show wall impacts.
 */
export const advanceProjectilesDetailed = (
  projectiles: readonly Projectile[],
  dt: number,
  bounds: Bounds,
  solids: readonly Solid[] = [],
): AdvanceResult => {
  const alive: Projectile[] = []
  const culled: ProjectileCull[] = []
  for (const p0 of projectiles) {
    // Semi-implicit Euler: apply gravity to velocity, then integrate position.
    const vel = vec2(p0.vel.x, p0.vel.y + (p0.ay ?? 0) * dt)
    const pos = vec2(p0.pos.x + vel.x * dt, p0.pos.y + vel.y * dt)
    const traveled = (p0.traveled ?? 0) + Math.hypot(vel.x * dt, vel.y * dt)
    const p = { ...p0, vel, pos, traveled }
    if (solids.some((s) => !s.oneWay && intersects(aabb(p.pos.x, p.pos.y, p.w, p.h), s))) {
      culled.push({ projectile: p, reason: 'wall' })
    } else if (!(p.pos.x + p.w > bounds.minX && p.pos.x < bounds.maxX)) {
      culled.push({ projectile: p, reason: 'bounds' })
    } else if (p.maxRange !== undefined && (p.traveled ?? 0) > p.maxRange) {
      culled.push({ projectile: p, reason: 'range' })
    } else {
      alive.push(p)
    }
  }
  return { alive, culled }
}

/**
 * Move projectiles by `dt`; cull those out of horizontal bounds, past max range
 * or hitting a solid wall. One-way platforms are ignored. Reusable for any
 * projectile list. (Thin wrapper over {@link advanceProjectilesDetailed}.)
 */
export const advanceProjectiles = (
  projectiles: readonly Projectile[],
  dt: number,
  bounds: Bounds,
  solids: readonly Solid[] = [],
): Projectile[] => advanceProjectilesDetailed(projectiles, dt, bounds, solids).alive

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
