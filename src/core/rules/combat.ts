import { aabb, intersects, type AABB } from '@core/math/aabb'
import { hitEnemy, type Enemy } from '@core/enemies/enemy'
import type { Projectile } from '@core/weapons/weapon'

/**
 * Combat resolution between the player, its projectiles and enemies.
 * Pure core: deterministic, no side effects.
 */
export interface CombatResult {
  readonly projectiles: readonly Projectile[]
  readonly enemies: readonly Enemy[]
  /** True when a living enemy overlaps the player's box. */
  readonly playerHit: boolean
  /** Number of enemies that died during this resolution (for scoring). */
  readonly kills: number
}

const enemyBox = (e: Enemy): AABB => aabb(e.body.pos.x, e.body.pos.y, e.body.w, e.body.h)
const projBox = (p: Projectile): AABB => aabb(p.pos.x, p.pos.y, p.w, p.h)

export const resolveCombat = (
  playerBox: AABB,
  projectiles: readonly Projectile[],
  enemies: readonly Enemy[],
  /**
   * Visible world region. When given, the player can only damage an enemy whose
   * box overlaps it — a projectile passes harmlessly over/through off-screen
   * foes (so you can't kill what you can't see). Omit to disable the gate.
   */
  view?: AABB,
): CombatResult => {
  const next: Enemy[] = [...enemies]
  const survivors: Projectile[] = []
  let kills = 0
  const hittable = (e: Enemy): boolean =>
    e.state !== 'dead' && (view === undefined || intersects(view, enemyBox(e)))

  for (const p of projectiles) {
    const box = projBox(p)
    const idx = next.findIndex((e) => hittable(e) && intersects(box, enemyBox(e)))
    if (idx === -1) {
      survivors.push(p) // missed: projectile keeps flying
      continue
    }
    const hurt = hitEnemy(next[idx]!)
    if (hurt.state === 'dead') kills++
    next[idx] = hurt
    // projectile is consumed on hit (not pushed to survivors)
  }

  const playerHit = next.some((e) => e.state !== 'dead' && intersects(playerBox, enemyBox(e)))

  return { projectiles: survivors, enemies: next, playerHit, kills }
}

export interface MeleeResult {
  readonly enemies: readonly Enemy[]
  /** Number of enemies that died from the swing (for scoring). */
  readonly kills: number
}

/**
 * Resolve a melee swing: every living enemy overlapping `meleeBox` takes one
 * hit. Used for the point-blank jab on every throw so arcing weapons (which fly
 * over a foe right next to the player) can still hit adjacent enemies.
 */
export const resolveMelee = (
  meleeBox: AABB,
  enemies: readonly Enemy[],
  view?: AABB,
): MeleeResult => {
  const next: Enemy[] = [...enemies]
  let kills = 0
  for (let i = 0; i < next.length; i++) {
    const e = next[i]!
    const visible = view === undefined || intersects(view, enemyBox(e))
    if (e.state !== 'dead' && visible && intersects(meleeBox, enemyBox(e))) {
      const hurt = hitEnemy(e)
      if (hurt.state === 'dead') kills++
      next[i] = hurt
    }
  }
  return { enemies: next, kills }
}

export interface EnemyProjectileResult {
  /** Enemy projectiles still in flight (those that did not hit the player). */
  readonly projectiles: readonly Projectile[]
  /** True when an enemy projectile hit the player. */
  readonly playerHit: boolean
}

/** Resolve enemy projectiles against the player: the first hit is consumed and flags damage. */
export const resolveEnemyProjectiles = (
  playerBox: AABB,
  projectiles: readonly Projectile[],
): EnemyProjectileResult => {
  const survivors: Projectile[] = []
  let playerHit = false
  for (const p of projectiles) {
    if (intersects(projBox(p), playerBox)) playerHit = true
    else survivors.push(p)
  }
  return { projectiles: survivors, playerHit }
}
