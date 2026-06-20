import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { createRng } from '@core/math/rng'
import {
  createChest,
  createDrop,
  openChests,
  rollReward,
  REWARD_TABLE,
  CHEST_WEAPONS,
  CHEST_POINTS,
  type Chest,
  type ChestReward,
} from './chest'

const player = aabb(100, 100, 24, 48)

describe('chest', () => {
  it('opens on overlap and yields its reward', () => {
    const chest = createChest(110, 120, { kind: 'weapon', weaponId: 'axe' })
    const r = openChests(player, [chest])
    expect(r.rewards).toEqual([{ kind: 'weapon', weaponId: 'axe' }])
    expect(r.chests[0]!.opened).toBe(true)
  })

  it('opened chest does not retrigger', () => {
    const opened: Chest = { ...createChest(110, 120, { kind: 'armor' }), opened: true }
    const r = openChests(player, [opened])
    expect(r.rewards).toHaveLength(0)
    expect(r.chests[0]!.opened).toBe(true)
  })

  it('stays closed when the player is apart', () => {
    const chest = createChest(500, 120, { kind: 'life' })
    const r = openChests(player, [chest])
    expect(r.rewards).toHaveLength(0)
    expect(r.chests[0]!.opened).toBe(false)
  })

  it('only the overlapping chest opens', () => {
    const near = createChest(110, 120, { kind: 'points', points: 500 })
    const far = createChest(900, 120, { kind: 'curse' })
    const r = openChests(player, [near, far])
    expect(r.rewards).toEqual([{ kind: 'points', points: 500 }])
    expect(r.chests[0]!.opened).toBe(true)
    expect(r.chests[1]!.opened).toBe(false)
  })

  it('an explicit reward is fixed (not random)', () => {
    const chest = createChest(110, 120, { kind: 'armor' })
    expect(chest.random).toBe(false)
  })

  it('omitting the reward marks the chest random', () => {
    const chest = createChest(110, 120)
    expect(chest.random).toBe(true)
  })
})

describe('rollReward', () => {
  const validKinds = new Set<ChestReward['kind']>(['weapon', 'armor', 'points', 'life', 'curse'])

  it('is deterministic for a given seed', () => {
    const seq = (seed: number) => {
      const rng = createRng(seed)
      return Array.from({ length: 8 }, () => rollReward(rng))
    }
    expect(seq(42)).toEqual(seq(42))
  })

  it('only ever yields valid reward kinds', () => {
    const rng = createRng(1)
    for (let i = 0; i < 500; i++) {
      expect(validKinds.has(rollReward(rng).kind)).toBe(true)
    }
  })

  it('rolls weapon ids and point values from the published pools', () => {
    const rng = createRng(7)
    for (let i = 0; i < 500; i++) {
      const r = rollReward(rng)
      if (r.kind === 'weapon') expect(CHEST_WEAPONS).toContain(r.weaponId)
      if (r.kind === 'points') expect(CHEST_POINTS).toContain(r.points)
    }
  })

  it('every table entry is reachable across many rolls', () => {
    const rng = createRng(123)
    const seen = new Set<ChestReward['kind']>()
    for (let i = 0; i < 2000; i++) seen.add(rollReward(rng).kind)
    expect(seen.size).toBe(REWARD_TABLE.length)
  })

  it('never yields a curse when curses are excluded (enemy drops)', () => {
    const rng = createRng(99)
    for (let i = 0; i < 2000; i++) expect(rollReward(rng, false).kind).not.toBe('curse')
  })
})

describe('createDrop', () => {
  it('is a fixed, collectible pickup flagged as a drop', () => {
    const d = createDrop(300, 300, { kind: 'life' })
    expect(d.drop).toBe(true)
    expect(d.random).toBe(false)
    expect(d.opened).toBe(false)
    expect(d.reward).toEqual({ kind: 'life' })
  })

  it('is collected on overlap like a chest', () => {
    const d = createDrop(110, 120, { kind: 'points', points: 500 })
    const r = openChests(player, [d])
    expect(r.rewards).toEqual([{ kind: 'points', points: 500 }])
    expect(r.chests[0]!.opened).toBe(true)
  })
})
