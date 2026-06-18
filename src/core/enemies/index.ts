import type { AABB } from '@core/math/aabb'
import type { Enemy, EnemyTarget } from './enemy'
import { stepZombie } from './zombie'
import { stepFlyer } from './flyer'
import { stepOgre } from './ogre'

export * from './enemy'
export * from './zombie'
export * from './flyer'
export * from './ogre'

/** Route an enemy to its per-kind step behavior. */
export const stepEnemy = (
  e: Enemy,
  target: EnemyTarget,
  solids: readonly AABB[],
  dt: number,
): Enemy => {
  switch (e.kind) {
    case 'zombie':
      return stepZombie(e, target, solids, dt)
    case 'flyer':
      return stepFlyer(e, target, solids, dt)
    case 'ogre':
      return stepOgre(e, target, solids, dt)
  }
}
