import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { createBody, stepBody } from './body'

const GRAVITY = 1000
const DT = 1 / 60

describe('body physics', () => {
  it('applies gravity in free fall (no solids)', () => {
    const body = createBody(0, 0, 10, 10)
    const next = stepBody(body, [], GRAVITY, DT)
    expect(next.vel.y).toBeCloseTo(GRAVITY * DT, 5)
    expect(next.pos.y).toBeGreaterThan(0)
    expect(next.grounded).toBe(false)
  })

  it('lands on top of a platform and becomes grounded', () => {
    const ground = aabb(0, 100, 200, 20)
    // Body above the ground (not overlapping), moving down fast enough to overlap this step.
    let body = createBody(50, 85, 10, 10)
    body = { ...body, vel: { x: 0, y: 500 } }
    const next = stepBody(body, [ground], GRAVITY, DT)
    expect(next.grounded).toBe(true)
    expect(next.vel.y).toBe(0)
    // Rests exactly on top of the ground (ground.y - height).
    expect(next.pos.y).toBe(90)
  })

  it('stops against a wall when moving right', () => {
    const wall = aabb(100, 0, 20, 200)
    let body = createBody(80, 50, 10, 10)
    body = { ...body, vel: { x: 900, y: 0 } }
    const next = stepBody(body, [wall], 0, DT)
    expect(next.vel.x).toBe(0)
    // Right edge meets the wall's left edge (wall.x - width).
    expect(next.pos.x).toBe(90)
  })

  it('bonks its head when moving up into a ceiling', () => {
    const ceiling = aabb(0, 0, 200, 20)
    let body = createBody(50, 25, 10, 10)
    body = { ...body, vel: { x: 0, y: -600 } }
    const next = stepBody(body, [ceiling], 0, DT)
    expect(next.vel.y).toBe(0)
    // Top edge meets the ceiling's bottom edge (ceiling.y + height).
    expect(next.pos.y).toBe(20)
  })

  it('is deterministic: same inputs produce the same output', () => {
    const ground = aabb(0, 100, 200, 20)
    const a = stepBody(createBody(50, 80, 10, 10), [ground], GRAVITY, DT)
    const b = stepBody(createBody(50, 80, 10, 10), [ground], GRAVITY, DT)
    expect(a).toEqual(b)
  })
})
