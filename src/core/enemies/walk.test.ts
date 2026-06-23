import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { createBody, type Body } from '@core/physics/body'
import { advanceDir, AGGRO_RANGE, groundAhead, patrolDir, wallAhead } from './walk'

// Floor segment x:[0,100] at y=200; a pit to its right.
const FLOOR = aabb(0, 200, 100, 40)
// A grounded body resting on the floor near its right edge (foot at y=200).
const grounded = (x: number): Body => ({ ...createBody(x, 160, 24, 40), grounded: true })

describe('ledge/wall probes', () => {
  it('sees floor behind but not ahead at a right-hand ledge', () => {
    const b = grounded(80) // right edge at 104, past the floor (100)
    expect(groundAhead(b, -1, [FLOOR])).toBe(true)
    expect(groundAhead(b, 1, [FLOOR])).toBe(false)
  })

  it('detects a wall ahead but not the floor underfoot', () => {
    const wall = aabb(110, 120, 20, 120) // tall solid to the right of a body at x=86
    const b = grounded(86) // right edge at 110, touching the wall
    expect(wallAhead(b, 1, [FLOOR, wall])).toBe(true)
    expect(wallAhead(b, -1, [FLOOR, wall])).toBe(false)
    expect(wallAhead(b, 1, [FLOOR])).toBe(false) // the floor is not a wall
  })
})

describe('patrolDir (melee)', () => {
  it('chases the player when close and reachable', () => {
    expect(patrolDir(grounded(20), 1, 0, [FLOOR])).toBe(-1) // player just left, floor left
  })

  it('does not chase a player beyond the aggro range', () => {
    // Player far to the right but within floor; out of range → patrol in `facing`.
    const farRight = AGGRO_RANGE + 500
    expect(patrolDir(grounded(20), 1, farRight, [FLOOR])).toBe(1) // keeps facing, floor ahead
  })

  it('turns around at a ledge and continues the other way', () => {
    // Facing right into the pit; flips to keep walking left along the floor.
    expect(patrolDir(grounded(80), 1, 0, [FLOOR])).toBe(-1)
  })

  it('holds only when boxed in both sides', () => {
    const island = aabb(80, 200, 20, 40) // narrower than the body: both edges overhang
    expect(patrolDir(grounded(78), 1, 999, [island])).toBe(0)
  })

  it('keeps its facing while airborne (lands normally)', () => {
    const air: Body = { ...createBody(80, 160, 24, 40), grounded: false }
    expect(patrolDir(air, -1, 999, [FLOOR])).toBe(-1)
  })
})

describe('advanceDir (ranged)', () => {
  it('advances toward the player where there is floor', () => {
    expect(advanceDir(grounded(60), 0, [FLOOR])).toBe(-1) // player left, floor left
  })

  it('holds at a ledge instead of diving into the pit', () => {
    expect(advanceDir(grounded(80), 999, [FLOOR])).toBe(0) // player right, pit right → hold
  })

  it('heads toward the player while airborne', () => {
    const air: Body = { ...createBody(80, 160, 24, 40), grounded: false }
    expect(advanceDir(air, 999, [FLOOR])).toBe(1)
  })
})

describe('ladder avoidance (tower stages)', () => {
  // A wide floor with a ladder column rising out of it (as on a tower shelf).
  const WIDE = aabb(0, 200, 400, 40)
  const LADDER = aabb(300, 60, 16, 180)
  const onWide = (x: number): Body => ({ ...createBody(x, 160, 24, 40), grounded: true })

  it('advanceDir holds clear of a ladder column instead of camping its exit', () => {
    const b = onWide(240) // right edge ~264: inside the ladder's clearance zone
    expect(advanceDir(b, 999, [WIDE])).toBe(1) // no ladders → walks onto the rung
    expect(advanceDir(b, 999, [WIDE], [LADDER])).toBe(0) // ladder there → stays back
  })

  it('patrolDir turns away from a ladder column rather than crossing it', () => {
    const b = onWide(240)
    expect(patrolDir(b, 1, 999, [WIDE], [LADDER])).toBe(-1) // blocked right, patrols left
  })
})
