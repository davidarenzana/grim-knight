import { PLAYER_H } from '@core/fsm/player'

/**
 * Application-layer tunables. Every gameplay/presentation magic number the
 * `stepMatch` use case emits lives here as a named constant, so the orchestrator
 * reads semantically and designers tweak one file. Presentation values (shake
 * presets, vfx scales, label colors) are part of the output port: the core emits
 * them as DATA and the adapter renders them (see ADR 0006).
 */

// --- Simulation / scoring -------------------------------------------------
/** Fixed simulation timestep (s). The whole sim is deterministic at 60 Hz. */
export const FIXED_DT = 1 / 60
/** Base score per regular kill (scaled by the loop's `scoreMul`). */
export const SCORE_PER_KILL = 100

// --- Player ---------------------------------------------------------------
/** Shorter profile while crouching (dodge high shots). */
export const CROUCH_H = Math.round(PLAYER_H * 0.6)
/** Px in front of the knight that a throw also jabs (point-blank). */
export const MELEE_REACH = 26
/** Vertical slack (px) for treating the knight as resting on a platform's top. */
export const PLATFORM_RIDE_EPS = 2

// --- Loot -----------------------------------------------------------------
/** Chance a slain regular enemy drops an item (a boss always does). */
export const DROP_CHANCE = 0.18

// --- World geometry -------------------------------------------------------
/** Invisible left/right world-boundary wall thickness (px). */
export const WORLD_WALL_THICKNESS = 40
/** How far the boundary walls extend above the world top (px). */
export const WORLD_WALL_PAD_TOP = 200
/** How far the boundary walls extend below the world bottom (px). */
export const WORLD_WALL_PAD_BOTTOM = 600
/** Drop below `worldHeight + this` (px) counts as falling out of the world. */
export const DEATH_Y_PAD = 40

// --- Bosses ---------------------------------------------------------------
/** Highest boss-variant index; skin escalates one variant per pair of stages. */
export const MAX_BOSS_VARIANT_INDEX = 2

// --- Presentation: camera shake presets (ms / normalized intensity) -------
export const SHAKE = {
  death: { ms: 320, intensity: 0.02 },
  kill: { ms: 90, intensity: 0.006 },
  armor: { ms: 150, intensity: 0.01 },
} as const

// --- Presentation: one-shot VFX scales ------------------------------------
export const VFX_SCALE = {
  deathExplosion: 0.42,
  sparkWall: 0.1,
  sparkHit: 0.14,
  sparkPlayerHit: 0.18,
  magicRing: 1.1,
} as const

// --- Presentation: floating reward label ----------------------------------
/** Px above the chest/drop the first reward label floats. */
export const FLOAT_LABEL_OFFSET_Y = 30
/** Extra px each stacked reward label is raised (multiple rewards at once). */
export const FLOAT_LABEL_STACK_Y = 18
/** Fallback weapon-label color when a weapon id has no entry in `WEAPON_COLOR`. */
export const DEFAULT_WEAPON_COLOR = 0xffffff

/** Reward-label color per weapon id (presentation data for the float effect). */
export const WEAPON_COLOR: Record<string, number> = {
  lance: 0xffcc00,
  dagger: 0xc0c0c0,
  torch: 0xff7a1a,
  axe: 0x66ccff,
}

/** Reward-label colors for non-weapon pickups. */
export const REWARD_COLOR = {
  curse: '#ff5555',
  armor: '#7fdfff',
  points: '#ffd23a',
  life: '#7cfc00',
} as const
