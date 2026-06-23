import type { Solid } from '@core/physics/body'
import type { Projectile } from '@core/weapons/weapon'
import type { Enemy, EnemyTarget } from './enemy'
import { stepZombie } from './zombie'
import { stepFlyer } from './flyer'
import { stepOgre } from './ogre'
import { stepPlant } from './plant'
import { stepBoss } from './boss'
import { stepCentipede } from './centipede'
import { stepTurtle } from './turtle'
import { stepBloated } from './bloated'

export * from './enemy'
export * from './zombie'
export * from './flyer'
export * from './ogre'
export * from './plant'
export * from './boss'
export * from './centipede'
export * from './turtle'
export * from './bloated'

export interface EnemyStepResult {
  readonly enemy: Enemy
  /** Projectiles the enemy fired this step (ranged enemies); empty otherwise. */
  readonly fired: readonly Projectile[]
}

/** Route an enemy to its per-kind step behavior, collecting any fired projectiles.
 *  `ladders` (tower stages only) keep ground walkers from camping a climb's exit. */
export const stepEnemy = (
  e: Enemy,
  target: EnemyTarget,
  solids: readonly Solid[],
  dt: number,
  ladders: readonly Solid[] = [],
): EnemyStepResult => {
  switch (e.kind) {
    case 'zombie':
      return { enemy: stepZombie(e, target, solids, dt, ladders), fired: [] }
    case 'flyer':
      return { enemy: stepFlyer(e, target, solids, dt), fired: [] }
    case 'ogre':
      return { enemy: stepOgre(e, target, solids, dt, ladders), fired: [] }
    case 'plant':
      return stepPlant(e, target, dt)
    case 'boss':
      return stepBoss(e, target, solids, dt, ladders)
    case 'centipede':
      return { enemy: stepCentipede(e, target, solids, dt, ladders), fired: [] }
    case 'turtle':
      return stepTurtle(e, target, solids, dt, ladders)
    case 'bloated':
      return stepBloated(e, target, dt)
  }
}
