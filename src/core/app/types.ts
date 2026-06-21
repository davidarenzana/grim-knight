import type { AABB } from '@core/math/aabb'
import type { Rng } from '@core/math/rng'
import type { Solid } from '@core/physics/body'
import type { Player, PlayerInput } from '@core/fsm/player'
import type { Enemy } from '@core/enemies'
import type { WeaponDef, WeaponState, Projectile } from '@core/weapons/weapon'
import type { Chest, ChestReward } from '@core/level/chest'
import type { Spawner } from '@core/level/spawner'
import type { StageTimer } from '@core/level/timer'
import type { Session } from '@core/rules/session'
import type { ArmorState } from '@core/rules/armor'

/**
 * Application layer (pure). This module defines the use-case contract for a
 * single in-progress stage: its STATE, the static CONFIG it runs against, the
 * input PORT it consumes, and the output PORT it produces (presentation effects
 * as DATA). The orchestrator `stepMatch` (added next) is the use case; the
 * Phaser scene becomes a thin adapter that renders `MatchState` and interprets
 * `Effect[]`.
 *
 * Like the rest of `core/`, this is framework-free: no Phaser, no bus, no DOM.
 * The boundary is crossed only with the plain data declared here.
 */

/** The input port: one frame of player intent (re-exported from the FSM). */
export type { PlayerInput }

/**
 * The mutable, deterministic simulation state of one stage run. Everything here
 * is gameplay; rendering bookkeeping (interpolation snapshots, sprite pools,
 * hit-flash timers) stays in the adapter.
 *
 * NOTE: `rng` is a deterministic but *stateful* dependency (mulberry32 closure)
 * — the one concession to purity. Threading it as immutable state is a possible
 * follow-up; for now the use case advances it in place, still reproducibly.
 */
export interface MatchState {
  readonly player: Player
  readonly weapon: WeaponState
  readonly activeWeapon: WeaponDef
  /** Weapon ids the knight owns (swap cycles only these). Always includes the
   *  active weapon; grows as weapon chests/drops are collected. */
  readonly ownedWeapons: readonly string[]
  readonly enemies: readonly Enemy[]
  readonly enemyProjectiles: readonly Projectile[]
  readonly chests: readonly Chest[]
  /** Items dropped by slain enemies, collected like chests. */
  readonly drops: readonly Chest[]
  readonly spawner: Spawner
  readonly timer: StageTimer
  readonly session: Session
  readonly rng: Rng
  /**
   * Lifecycle of the stage run. `playing` keeps stepping; the terminal phases
   * tell the adapter what transition to drive: `gameover` → show the game-over
   * screen; `cleared` → advance the campaign (next stage / next loop / victory).
   */
  readonly phase: MatchPhase
}

/** Stage-run lifecycle. Terminal phases are driven by the adapter (scene flow). */
export type MatchPhase = 'playing' | 'gameover' | 'cleared'

/** Static, per-stage context the use case runs against (does not change mid-run). */
export interface MatchConfig {
  readonly levelIndex: number
  readonly loop: number
  readonly solids: readonly Solid[]
  readonly ladders: readonly AABB[]
  readonly hazards: readonly AABB[]
  /** World horizontal bounds (level edges) for projectile culling. */
  readonly bounds: { readonly minX: number; readonly maxX: number }
  /** Y below which a fallen player dies / a fallen enemy is culled. */
  readonly deathY: number
  /** Y below which a wedged ground enemy is culled (soft-lock safety net). */
  readonly sinkY: number
  /** Spawn/respawn position for the knight. */
  readonly start: { readonly x: number; readonly y: number }
  /** Stage countdown length in seconds (re-applied on respawn). */
  readonly stageSeconds: number
}

/** One-shot visual effect the adapter plays at a world position. */
export type VfxName = 'spark' | 'explosion' | 'magic_ring'

/**
 * The output port, as DATA. The use case never calls Phaser/the bus directly;
 * it returns the effects it wants, and the adapter interprets them (camera
 * shake, VFX sprites, floating reward labels, HUD/bus notifications).
 */
export type Effect =
  | { readonly type: 'shake'; readonly ms: number; readonly intensity: number }
  | {
      readonly type: 'vfx'
      readonly name: VfxName
      readonly x: number
      readonly y: number
      readonly scale: number
    }
  | {
      readonly type: 'float'
      readonly label: string
      readonly color: string
      readonly reward: ChestReward
      readonly x: number
      readonly y: number
    }
  | { readonly type: 'notify'; readonly notification: GameNotification }

/**
 * UI-facing notifications owned by the application layer. The Phaser adapter
 * maps these onto the `shared/events` bus; in a later step the bus contract can
 * be reconciled to import these directly (keeping the port owned by the core).
 */
export type GameNotification =
  | { readonly kind: 'score'; readonly score: number }
  | { readonly kind: 'lives'; readonly lives: number }
  | { readonly kind: 'armor'; readonly armor: ArmorState }
  | { readonly kind: 'weapon'; readonly weapon: string }
  | { readonly kind: 'time'; readonly secondsLeft: number }
  | { readonly kind: 'level'; readonly level: number; readonly loop: number }
  | { readonly kind: 'boss-hp'; readonly hp: number; readonly maxHp: number }
  | { readonly kind: 'boss-cleared' }
  | { readonly kind: 'over'; readonly score: number }
  | { readonly kind: 'won'; readonly score: number }

/** The use-case result: the next state plus the effects to present this tick. */
export interface StepResult {
  readonly state: MatchState
  readonly effects: readonly Effect[]
}

/**
 * The application use case (implemented next, in `match.ts`): advance one fixed
 * simulation step purely, returning the next state and the presentation effects.
 */
export type StepMatch = (
  config: MatchConfig,
  state: MatchState,
  input: PlayerInput,
  dt: number,
) => StepResult
