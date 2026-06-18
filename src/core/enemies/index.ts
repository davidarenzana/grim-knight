import type { Solid } from '@core/physics/body'
import type { Projectile } from '@core/weapons/weapon'
import type { Enemy, EnemyTarget } from './enemy'
import { stepZombie } from './zombie'
import { stepFlyer } from './flyer'
import { stepOgre } from './ogre'
import { stepPlant } from './plant'

export * from './enemy'
export * from './zombie'
export * from './flyer'
export * from './ogre'
export * from './plant'

export interface EnemyStepResult {
  readonly enemy: Enemy
  /** Projectiles the enemy fired this step (ranged enemies); empty otherwise. */
  readonly fired: readonly Projectile[]
}

/** Route an enemy to its per-kind step behavior, collecting any fired projectiles. */
export const stepEnemy = (
  e: Enemy,
  target: EnemyTarget,
  solids: readonly Solid[],
  dt: number,
): EnemyStepResult => {
  switch (e.kind) {
    case 'zombie':
      return { enemy: stepZombie(e, target, solids, dt), fired: [] }
    case 'flyer':
      return { enemy: stepFlyer(e, target, solids, dt), fired: [] }
    case 'ogre':
      return { enemy: stepOgre(e, target, solids, dt), fired: [] }
    case 'plant':
      return stepPlant(e, target, dt)
  }
}
