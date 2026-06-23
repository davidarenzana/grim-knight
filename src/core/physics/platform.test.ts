import { describe, expect, it } from 'vitest'
import { createPlatform, platformSolid, stepPlatform } from './platform'

describe('stepPlatform', () => {
  it('advances toward the target endpoint', () => {
    const p = createPlatform(0, 100, 80, 16, { x: 100, y: 100 }, 50)
    const n = stepPlatform(p, 0.1) // 50 px/s * 0.1s = 5px toward (100,100)
    expect(n.pos.x).toBeCloseTo(5)
    expect(n.pos.y).toBe(100)
    expect(n.dir).toBe(1)
  })

  it('reverses at an endpoint', () => {
    const p = createPlatform(0, 100, 80, 16, { x: 100, y: 100 }, 50)
    const atEnd = stepPlatform(p, 2.1) // 105px ≥ the 100px segment → snap to the end + flip
    expect(atEnd.pos.x).toBe(100)
    expect(atEnd.dir).toBe(-1)
    const back = stepPlatform(atEnd, 0.1) // now heading back toward the origin (0)
    expect(back.pos.x).toBeCloseTo(95)
    expect(back.dir).toBe(-1)
  })

  it('snaps to the endpoint without overshoot', () => {
    const p = createPlatform(0, 0, 40, 10, { x: 3, y: 0 }, 50) // 3px segment, 5px step
    const n = stepPlatform(p, 0.1)
    expect(n.pos.x).toBe(3) // clamped to the endpoint, not 5
    expect(n.dir).toBe(-1)
  })

  it('moves along a vertical path too', () => {
    const p = createPlatform(0, 0, 40, 10, { x: 0, y: 100 }, 50)
    const n = stepPlatform(p, 0.1)
    expect(n.pos.x).toBe(0)
    expect(n.pos.y).toBeCloseTo(5)
  })

  it('is deterministic', () => {
    const p = createPlatform(0, 100, 80, 16, { x: 100, y: 100 }, 50)
    expect(stepPlatform(p, 0.1)).toEqual(stepPlatform(p, 0.1))
  })

  it('exposes a one-way solid at its current position', () => {
    const p = createPlatform(10, 20, 80, 16, { x: 100, y: 20 }, 50)
    expect(platformSolid(p)).toEqual({ x: 10, y: 20, w: 80, h: 16, oneWay: true })
  })
})
