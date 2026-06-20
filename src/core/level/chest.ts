import { aabb, intersects, type AABB } from '@core/math/aabb'
import type { Rng } from '@core/math/rng'

/**
 * Chests & pickups. A chest is a static box the knight opens by touching it.
 * Opening yields one reward and consumes the chest (idempotent). Pure core: the
 * decision is AABB overlap; the engine applies each reward's effect.
 */
export type ChestReward =
  | { readonly kind: 'weapon'; readonly weaponId: string }
  | { readonly kind: 'armor' }
  | { readonly kind: 'points'; readonly points: number }
  | { readonly kind: 'life' }
  | { readonly kind: 'curse' }

export interface Chest extends AABB {
  readonly reward: ChestReward
  readonly opened: boolean
  /** When true the engine re-rolls `reward` (via {@link rollReward}) at spawn. */
  readonly random: boolean
  /** True for an item dropped by a slain enemy (rendered as a floating icon). */
  readonly drop?: boolean
}

/** Default chest size in px. */
export const CHEST_W = 24
export const CHEST_H = 20
/** Default enemy-drop pickup size in px (smaller than a chest). */
export const DROP_W = 20
export const DROP_H = 20

/**
 * Placeholder reward for random chests before the engine rolls them. Never
 * observed in play: the engine overwrites it in `create()` ahead of the first
 * tick. Kept as a valid reward so the type stays a plain (non-optional) union.
 */
const PENDING_REWARD: ChestReward = { kind: 'points', points: 0 }

/**
 * Create a chest. With an explicit `reward` the chest always yields it; omit
 * `reward` for a loot chest whose contents the engine rolls per run
 * ({@link rollReward}).
 */
export const createChest = (
  x: number,
  y: number,
  reward?: ChestReward,
  w = CHEST_W,
  h = CHEST_H,
): Chest => ({
  ...aabb(x, y, w, h),
  reward: reward ?? PENDING_REWARD,
  random: reward === undefined,
  opened: false,
})

/**
 * Create an enemy-dropped pickup at (x, y) holding an already-rolled `reward`.
 * Collected on touch via {@link openChests} like a chest, but the engine renders
 * it as the reward's floating icon instead of a chest sprite.
 */
export const createDrop = (
  x: number,
  y: number,
  reward: ChestReward,
  w = DROP_W,
  h = DROP_H,
): Chest => ({ ...aabb(x, y, w, h), reward, random: false, opened: false, drop: true })

/** Weapon ids a loot chest can grant (the lance is the always-available start). */
export const CHEST_WEAPONS: readonly string[] = ['dagger', 'torch', 'axe']
/** Point values a "points" reward can roll. */
export const CHEST_POINTS: readonly number[] = [250, 500, 750, 1000]

interface RewardEntry {
  readonly weight: number
  readonly roll: (rng: Rng) => ChestReward
}

/** Positive rewards: weapons and points common, armor uncommon, a 1UP rare. */
const POSITIVE_TABLE: readonly RewardEntry[] = [
  { weight: 30, roll: (r) => ({ kind: 'weapon', weaponId: r.pick(CHEST_WEAPONS) }) },
  { weight: 25, roll: (r) => ({ kind: 'points', points: r.pick(CHEST_POINTS) }) },
  { weight: 18, roll: () => ({ kind: 'armor' }) },
  { weight: 12, roll: () => ({ kind: 'life' }) },
]

/** The magician's curse: a nasty-but-occasional surprise (GnG flavor). */
const CURSE_ENTRY: RewardEntry = { weight: 15, roll: () => ({ kind: 'curse' }) }

/**
 * Full weighted loot table (chests): the positive rewards plus the curse.
 */
export const REWARD_TABLE: readonly RewardEntry[] = [...POSITIVE_TABLE, CURSE_ENTRY]

const weightedPick = (table: readonly RewardEntry[], rng: Rng): ChestReward => {
  const total = table.reduce((sum, e) => sum + e.weight, 0)
  let t = rng.range(0, total)
  for (const entry of table) {
    t -= entry.weight
    if (t < 0) return entry.roll(rng)
  }
  return table[table.length - 1]!.roll(rng)
}

/**
 * Roll one reward by weight (deterministic per rng). Chests pass
 * `includeCurse: true` (the default); enemy drops pass `false` so a slain foe
 * never hands the player a curse.
 */
export const rollReward = (rng: Rng, includeCurse = true): ChestReward =>
  weightedPick(includeCurse ? REWARD_TABLE : POSITIVE_TABLE, rng)

export interface OpenResult {
  readonly chests: readonly Chest[]
  /** Rewards from chests opened by this call only (newly opened). */
  readonly rewards: readonly ChestReward[]
}

/** Open every unopened chest the player overlaps; collect their rewards. */
export const openChests = (playerBox: AABB, chests: readonly Chest[]): OpenResult => {
  const rewards: ChestReward[] = []
  const updated = chests.map((c) => {
    if (!c.opened && intersects(playerBox, c)) {
      rewards.push(c.reward)
      return { ...c, opened: true }
    }
    return c
  })
  return { chests: updated, rewards }
}
