/**
 * Weapon catalog + registry. Pure data: every weapon reuses the same `WeaponDef`
 * shape with different tuning (speed, cooldown, arc, reach). The projectile
 * mechanics that consume these defs live in ./projectile; both are re-exported
 * from ./weapon so import sites stay stable.
 */
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

/** The kit the knight starts — and respawns — with. Swap cycles only these
 *  until chests/drops add more; losing a life resets the arsenal back to it. */
export const STARTING_WEAPONS: readonly string[] = [DAGGER.id, TORCH.id]

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
