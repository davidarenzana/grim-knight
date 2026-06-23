import {
  createZombie,
  createFlyer,
  createOgre,
  createPlant,
  createBoss,
  createCentipede,
  createTurtle,
  createBloated,
  type Enemy,
  type EnemyKind,
  type BossVariant,
} from '@core/enemies'
import type { Difficulty } from '@core/rules/difficulty'
import { MAX_BOSS_VARIANT_INDEX } from './tuning'

/** Boss skin/stats escalate one variant per pair of stages (1,1,2,2,3,3). */
export const bossVariant = (levelIndex: number): BossVariant =>
  (Math.min(MAX_BOSS_VARIANT_INDEX, Math.floor(levelIndex / 2)) + 1) as BossVariant

/** Scale a freshly-spawned enemy by the loop difficulty: tougher (HP + HP-bar
 *  max) and faster (a `speedScale` the per-kind steps read for their movement). */
export const scaleEnemy = (e: Enemy, hpMul: number, speedMul: number): Enemy => {
  let out = e
  if (hpMul !== 1) {
    const hp = Math.max(1, Math.round(e.hp * hpMul))
    out =
      e.maxHp === undefined ? { ...out, hp } : { ...out, hp, maxHp: Math.round(e.maxHp * hpMul) }
  }
  if (speedMul !== 1) out = { ...out, speedScale: speedMul }
  return out
}

/** Build a difficulty-scaled enemy of `kind` at (x, y) for the current stage. */
export const spawnEnemy = (
  kind: EnemyKind,
  x: number,
  y: number,
  levelIndex: number,
  difficulty: Difficulty,
): Enemy => {
  const base = ((): Enemy => {
    switch (kind) {
      case 'zombie':
        return createZombie(x, y)
      case 'ogre':
        return createOgre(x, y)
      case 'flyer':
        return createFlyer(x, y)
      case 'plant':
        return createPlant(x, y)
      case 'boss':
        return createBoss(x, y, bossVariant(levelIndex))
      case 'centipede':
        return createCentipede(x, y)
      case 'turtle':
        return createTurtle(x, y)
      case 'bloated':
        return createBloated(x, y)
    }
  })()
  return scaleEnemy(base, difficulty.enemyHpMul, difficulty.enemySpeedMul)
}
