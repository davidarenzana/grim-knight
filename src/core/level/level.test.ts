import { describe, expect, it } from 'vitest'
import { LEVELS } from './level'
import { weaponById } from '@core/weapons/weapon'

const SCREEN_W = 800

describe('levels', () => {
  it('has the six stages with unique names', () => {
    expect(LEVELS).toHaveLength(6)
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(6)
  })

  it('each level is wider than the screen (so the camera scrolls)', () => {
    for (const lvl of LEVELS) expect(lvl.worldWidth).toBeGreaterThanOrEqual(SCREEN_W)
  })

  it('every spawn sits within the world bounds', () => {
    for (const lvl of LEVELS) {
      for (const s of lvl.spawns) {
        expect(s.x).toBeGreaterThanOrEqual(0)
        expect(s.x).toBeLessThanOrEqual(lvl.worldWidth)
      }
    }
  })

  it('each level ends with a boss (so it is clearable to advance)', () => {
    for (const lvl of LEVELS) {
      expect(lvl.spawns.some((s) => s.kind === 'boss')).toBe(true)
    }
  })

  it('the player starts inside the world', () => {
    for (const lvl of LEVELS) {
      expect(lvl.playerStart.x).toBeGreaterThanOrEqual(0)
      expect(lvl.playerStart.x).toBeLessThan(lvl.worldWidth)
    }
  })

  it('chests sit within bounds and reference valid weapons', () => {
    for (const lvl of LEVELS) {
      for (const c of lvl.chests ?? []) {
        expect(c.x).toBeGreaterThanOrEqual(0)
        expect(c.x).toBeLessThanOrEqual(lvl.worldWidth)
        if (c.reward.kind === 'weapon') expect(weaponById(c.reward.weaponId)).toBeDefined()
      }
    }
  })
})
