import { describe, expect, it } from 'vitest'
import { add, length, lerp, normalize, scale, sub, vec2, ZERO } from './vector'

describe('vector', () => {
  it('add sums component-wise', () => {
    expect(add(vec2(1, 2), vec2(3, 4))).toEqual(vec2(4, 6))
  })

  it('sub subtracts component-wise', () => {
    expect(sub(vec2(5, 7), vec2(2, 3))).toEqual(vec2(3, 4))
  })

  it('scale multiplies by a scalar', () => {
    expect(scale(vec2(2, -3), 2)).toEqual(vec2(4, -6))
  })

  it('length computes the magnitude (3-4-5)', () => {
    expect(length(vec2(3, 4))).toBe(5)
  })

  it('normalize returns a unit vector', () => {
    expect(length(normalize(vec2(0, 10)))).toBeCloseTo(1)
  })

  it('normalize of zero is zero (no NaN)', () => {
    expect(normalize(ZERO)).toEqual(ZERO)
  })

  it('lerp interpolates between a and b', () => {
    expect(lerp(vec2(0, 0), vec2(10, 20), 0.5)).toEqual(vec2(5, 10))
  })
})
