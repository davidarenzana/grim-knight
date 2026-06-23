import { describe, expect, it } from 'vitest'
import { difficultyForLoop, TIER_NAMES, TIME_SCALE_FLOOR, SPEED_MUL_CAP } from './difficulty'

describe('difficulty', () => {
  it('names tiers by loop', () => {
    expect(difficultyForLoop(1).name).toBe('MORTAL')
    expect(difficultyForLoop(2).name).toBe('DAMNED')
    expect(difficultyForLoop(3).name).toBe('INFERNAL')
    expect(difficultyForLoop(7).name).toBe('INFERNAL')
    expect(difficultyForLoop(1).tier).toBe(1)
    expect(difficultyForLoop(2).tier).toBe(2)
    expect(difficultyForLoop(3).tier).toBe(3)
    expect(difficultyForLoop(99).tier).toBe(3)
    expect(TIER_NAMES).toEqual(['MORTAL', 'DAMNED', 'INFERNAL'])
  })

  it('loop 1 is the baseline', () => {
    const d = difficultyForLoop(1)
    expect(d.enemyHpMul).toBe(1)
    expect(d.timeScale).toBe(1)
    expect(d.enemySpeedMul).toBe(1)
    expect(d.scoreMul).toBe(1)
  })

  it('ramps every loop', () => {
    for (let loop = 1; loop < 12; loop++) {
      const a = difficultyForLoop(loop)
      const b = difficultyForLoop(loop + 1)
      expect(b.enemyHpMul).toBeGreaterThan(a.enemyHpMul)
      expect(b.scoreMul).toBeGreaterThan(a.scoreMul)
      expect(b.timeScale).toBeLessThanOrEqual(a.timeScale)
      expect(b.enemySpeedMul).toBeGreaterThanOrEqual(a.enemySpeedMul)
    }
  })

  it('floors the time scale on deep loops', () => {
    expect(difficultyForLoop(50).timeScale).toBe(TIME_SCALE_FLOOR)
    for (let loop = 1; loop <= 50; loop++) {
      expect(difficultyForLoop(loop).timeScale).toBeGreaterThanOrEqual(TIME_SCALE_FLOOR)
    }
  })

  it('caps enemy speed so the physics step stays sane', () => {
    expect(difficultyForLoop(50).enemySpeedMul).toBe(SPEED_MUL_CAP)
    for (let loop = 1; loop <= 50; loop++) {
      const m = difficultyForLoop(loop).enemySpeedMul
      expect(m).toBeGreaterThanOrEqual(1)
      expect(m).toBeLessThanOrEqual(SPEED_MUL_CAP)
    }
  })

  it('clamps loops below 1 to the baseline tier', () => {
    expect(difficultyForLoop(0).tier).toBe(1)
    expect(difficultyForLoop(0).name).toBe('MORTAL')
    expect(difficultyForLoop(0).enemyHpMul).toBe(1)
  })
})
