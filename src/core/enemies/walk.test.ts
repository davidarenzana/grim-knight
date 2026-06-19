import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { createBody, type Body } from '@core/physics/body'
import { chooseDir, groundAhead } from './walk'

// Floor segment x:[0,100] at y=200; a pit to its right.
const FLOOR = aabb(0, 200, 100, 40)
// A grounded body resting on the floor near its right edge (foot at y=200).
const grounded = (x: number): Body => ({ ...createBody(x, 160, 24, 40), grounded: true })

describe('ledge-aware walking', () => {
  it('sees floor behind but not ahead at a right-hand ledge', () => {
    const b = grounded(80) // right edge at 104, past the floor (100)
    expect(groundAhead(b, -1, [FLOOR])).toBe(true)
    expect(groundAhead(b, 1, [FLOOR])).toBe(false)
  })

  it('heads toward the player when there is floor that way', () => {
    expect(chooseDir(grounded(20), 0, [FLOOR])).toBe(-1) // player left, floor left
  })

  it('turns around at a ledge instead of walking off', () => {
    // Player to the right, but the floor ends to the right → go left instead.
    expect(chooseDir(grounded(80), 999, [FLOOR])).toBe(-1)
  })

  it('holds still when there is no floor either way', () => {
    const island = aabb(80, 200, 20, 40) // narrower than the body: both edges overhang
    expect(chooseDir(grounded(78), 999, [island])).toBe(0)
  })

  it('does not restrict direction while airborne (lands normally)', () => {
    const air: Body = { ...createBody(80, 160, 24, 40), grounded: false }
    expect(chooseDir(air, 999, [FLOOR])).toBe(1) // toward player despite the ledge
  })
})
