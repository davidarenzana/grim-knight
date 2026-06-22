/**
 * Endless-loop difficulty. The campaign never ends: clearing the final stage
 * restarts at stage 1 with a harder loop, forever. Difficulty is bucketed into
 * three named tiers and keeps escalating every loop.
 *
 * Pure core: a deterministic function of the loop number, no side effects.
 */

/** Display names per tier (index 0 = tier 1). */
export const TIER_NAMES = ['MORTAL', 'DAMNED', 'INFERNAL'] as const

export type Tier = 1 | 2 | 3

/** Stage time never shrinks below this fraction, however deep the loop. */
export const TIME_SCALE_FLOOR = 0.55

export interface Difficulty {
  /** Bucketed tier (1–3); loop 1 = 1, loop 2 = 2, loop 3+ = 3. */
  readonly tier: Tier
  /** Display name for the tier (MORTAL / DAMNED / INFERNAL). */
  readonly name: string
  /** Enemy HP multiplier — tougher foes on deeper loops. */
  readonly enemyHpMul: number
  /** Stage-clock multiplier — more time pressure on deeper loops. */
  readonly timeScale: number
  /** Score multiplier — deeper loops pay more (arcade risk/reward). */
  readonly scoreMul: number
}

/**
 * Resolve the difficulty for a given loop. Loop 1 is the unscaled baseline;
 * every subsequent loop ramps (`step = loop - 1`). The tier *name* caps at three
 * buckets, but the numeric scaling keeps climbing — INFERNAL (loop 3+) gets
 * harder each cycle, which is the "endless" part.
 */
export const difficultyForLoop = (loop: number): Difficulty => {
  const step = Math.max(0, loop - 1)
  const tier = Math.min(3, Math.max(1, Math.floor(loop))) as Tier
  return {
    tier,
    name: TIER_NAMES[tier - 1]!,
    enemyHpMul: 1 + 0.5 * step,
    timeScale: Math.max(TIME_SCALE_FLOOR, 1 - 0.12 * step),
    scoreMul: 1 + 0.5 * step,
  }
}
