import { aabb, intersects, type AABB } from '@core/math/aabb'

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
}

/** Default chest size in px. */
export const CHEST_W = 24
export const CHEST_H = 20

export const createChest = (
  x: number,
  y: number,
  reward: ChestReward,
  w = CHEST_W,
  h = CHEST_H,
): Chest => ({ ...aabb(x, y, w, h), reward, opened: false })

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
