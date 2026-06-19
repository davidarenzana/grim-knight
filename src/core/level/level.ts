import { STAGES } from './stages'
import type { LevelDef } from './types'

/**
 * Public level surface. Types live in `./types`, shared geometry helpers in
 * `./geometry`, and each stage is its own module under `./stages`. This file
 * just re-exports the type and assembles the ordered campaign so existing
 * imports of `@core/level/level` keep working.
 */
export type { LevelDef, LevelTheme } from './types'

/** All stages in play order (the campaign). */
export const LEVELS: readonly LevelDef[] = STAGES
