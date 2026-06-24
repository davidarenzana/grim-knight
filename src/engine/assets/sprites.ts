/**
 * Barrel for the three independent sprite pipelines, kept so existing import
 * sites (`@engine/assets/sprites`) stay stable:
 *  - `charSprites`     — character/enemy animated spritesheets (the `SPRITES` table).
 *  - `weaponSprites`   — thrown-weapon projectile animations.
 *  - `enemyProjectiles`— enemy shot art (animated fireball / tinted bolts).
 */
export * from './charSprites'
export * from './weaponSprites'
export * from './enemyProjectiles'
