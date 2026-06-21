import { describe, expect, it } from 'vitest'
import { MAX_ENTRIES, insertScore, qualifies, sanitizeName, type HighScore } from './highscores'

/** Build a descending table of `n` entries scored `base, base-step, ...`. */
const table = (n: number, base = 1000, step = 100): HighScore[] =>
  Array.from({ length: n }, (_, i) => ({
    name: 'AAA',
    score: base - i * step,
    level: 1,
    loop: 1,
  }))

const entry = (score: number, name = 'BOB'): HighScore => ({ name, score, level: 1, loop: 1 })

describe('highscores', () => {
  it('empty table qualifies any', () => {
    expect(qualifies([], 0)).toBe(true)
  })

  it('high score qualifies', () => {
    expect(qualifies(table(MAX_ENTRIES), 1500)).toBe(true)
  })

  it('low score rejected', () => {
    // A full table whose lowest entry is above the candidate.
    expect(qualifies(table(MAX_ENTRIES), 50)).toBe(false)
  })

  it('inserts and reports rank', () => {
    const t: HighScore[] = [entry(2000), entry(1000)]
    const { table: next, rank } = insertScore(t, entry(1500))
    expect(next.map((e) => e.score)).toEqual([2000, 1500, 1000])
    expect(rank).toBe(1)
  })

  it('ties keep older ahead', () => {
    const t: HighScore[] = [entry(1000, 'OLD')]
    const { table: next, rank } = insertScore(t, entry(1000, 'NEW'))
    expect(next.map((e) => e.name)).toEqual(['OLD', 'NEW'])
    expect(rank).toBe(1)
  })

  it('caps at ten', () => {
    const { table: next } = insertScore(table(MAX_ENTRIES), entry(99999))
    expect(next).toHaveLength(MAX_ENTRIES)
    expect(next[0]?.score).toBe(99999)
    // The previous lowest (1000 - 9*100 = 100) is dropped.
    expect(next.some((e) => e.score === 100)).toBe(false)
  })

  it('non-qualifying is no-op', () => {
    const t = table(MAX_ENTRIES)
    const { table: next, rank } = insertScore(t, entry(50))
    expect(next).toEqual(t)
    expect(rank).toBe(-1)
  })

  it('does not mutate the input table', () => {
    const t: HighScore[] = [entry(2000)]
    insertScore(t, entry(3000))
    expect(t).toHaveLength(1)
  })

  it('sanitizes initials', () => {
    expect(sanitizeName('DAV')).toBe('DAV')
    expect(sanitizeName('david')).toBe('DAV')
    expect(sanitizeName('ab')).toBe('AB ')
    expect(sanitizeName('a1!')).toBe('A  ')
    expect(sanitizeName('')).toBe('AAA')
    expect(sanitizeName('   ')).toBe('AAA')
  })
})
