/**
 * Deterministic pseudo-random number generator (mulberry32).
 * Same seed -> same sequence. Essential to keep the simulation reproducible in
 * tests (same input -> same result). Never use Math.random() inside `core/`.
 */
export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number
  /** Float in [min, max). */
  range(min: number, max: number): number
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T
}

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0

  const next = (): number => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const range = (min: number, max: number): number => min + next() * (max - min)

  const int = (min: number, max: number): number => Math.floor(range(min, max + 1))

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('rng.pick: empty array')
    return items[int(0, items.length - 1)] as T
  }

  return { next, int, range, pick }
}
