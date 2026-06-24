/**
 * Barrel for the weapon model, kept so existing import sites
 * (`@core/weapons/weapon`) stay stable:
 *  - `defs`       — the weapon catalog + registry (`WeaponDef`, LANCE/DAGGER/…).
 *  - `projectile` — the projectile model + mechanics (`fire`, advance/step).
 */
export * from './defs'
export * from './projectile'
