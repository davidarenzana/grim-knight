import type { LevelDef } from '../types'
import { graveyard } from './graveyard'
import { hauntedForest } from './haunted-forest'
import { swampCaverns } from './swamp-caverns'
import { ironFortress } from './iron-fortress'
import { frozenSpires } from './frozen-spires'
import { demonKeep } from './demon-keep'

export { graveyard, hauntedForest, swampCaverns, ironFortress, frozenSpires, demonKeep }

/** The six stages in play order. */
export const STAGES: readonly LevelDef[] = [
  graveyard,
  hauntedForest,
  swampCaverns,
  ironFortress,
  frozenSpires,
  demonKeep,
]
