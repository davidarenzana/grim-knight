import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { createChest, openChests, type Chest } from './chest'

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
})
