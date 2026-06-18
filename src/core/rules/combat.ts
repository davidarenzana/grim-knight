import { aabb, intersects, type AABB } from '@core/math/aabb'
import { hitEnemy, type Enemy } from '@core/enemies/zombie'
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
): CombatResult => {
  const next: Enemy[] = [...enemies]
  const survivors: Projectile[] = []
  let kills = 0

  for (const p of projectiles) {
    const box = projBox(p)
    const idx = next.findIndex((e) => e.state !== 'dead' && intersects(box, enemyBox(e)))
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
