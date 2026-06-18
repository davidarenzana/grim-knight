import { describe, expect, it } from 'vitest'
import { createRng } from './rng'

describe('rng (deterministic)', () => {
  it('the same seed produces the same sequence', () => {
    const a = createRng(12345)
    const b = createRng(12345)
    const seqA = [a.next(), a.next(), a.next()]
    const seqB = [b.next(), b.next(), b.next()]
    expect(seqA).toEqual(seqB)
  })

  it('different seeds produce different sequences', () => {
    const a = createRng(1)
    const b = createRng(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('next is always in [0, 1)', () => {
    const r = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int respects the inclusive range', () => {
    const r = createRng(99)
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 6)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(6)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('pick throws on an empty array', () => {
    const r = createRng(1)
    expect(() => r.pick([])).toThrow()
  })

  it('pick returns an element from the array', () => {
    const r = createRng(42)
    const items = ['a', 'b', 'c'] as const
    expect(items).toContain(r.pick(items))
  })
})
