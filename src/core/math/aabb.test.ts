import { describe, expect, it } from 'vitest'
import { aabb, bottom, containsPoint, intersects, overlap, right } from './aabb'

describe('aabb', () => {
  it('right and bottom compute the edges', () => {
    const b = aabb(10, 20, 30, 40)
    expect(right(b)).toBe(40)
    expect(bottom(b)).toBe(60)
  })

  it('intersects detects a real overlap', () => {
    expect(intersects(aabb(0, 0, 10, 10), aabb(5, 5, 10, 10))).toBe(true)
  })

  it('intersects: separated boxes do not overlap', () => {
    expect(intersects(aabb(0, 0, 10, 10), aabb(20, 0, 10, 10))).toBe(false)
  })

  it('intersects: exact edge contact does not count', () => {
    expect(intersects(aabb(0, 0, 10, 10), aabb(10, 0, 10, 10))).toBe(false)
  })

  it('containsPoint detects inside and outside points', () => {
    const b = aabb(0, 0, 10, 10)
    expect(containsPoint(b, 5, 5)).toBe(true)
    expect(containsPoint(b, 15, 5)).toBe(false)
  })

  it('overlap returns the penetration depth', () => {
    expect(overlap(aabb(0, 0, 10, 10), aabb(8, 0, 10, 10))).toEqual({ x: 2, y: 10 })
  })

  it('overlap is zero when there is no overlap', () => {
    expect(overlap(aabb(0, 0, 10, 10), aabb(50, 50, 10, 10))).toEqual({ x: 0, y: 0 })
  })
})
