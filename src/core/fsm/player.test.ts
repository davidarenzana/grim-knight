import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { createPlayer, JUMP_IMPULSE, PLAYER_H, stepPlayer, type PlayerInput } from './player'

const DT = 1 / 60
const GROUND = aabb(0, 200, 400, 40)
const NONE: PlayerInput = { left: false, right: false, jump: false, down: false }

// A player resting exactly on top of the ground.
const grounded = () => {
  const p = createPlayer(100, 200 - PLAYER_H)
  // One settling step makes `grounded` true.
  return stepPlayer(p, NONE, [GROUND], DT)
}

describe('player', () => {
  it('walks right', () => {
    const start = grounded()
    const next = stepPlayer(start, { ...NONE, right: true }, [GROUND], DT)
    expect(next.state).toBe('run')
    expect(next.body.pos.x).toBeGreaterThan(start.body.pos.x)
    expect(next.facing).toBe(1)
  })

  it('stops to idle', () => {
    const next = stepPlayer(grounded(), NONE, [GROUND], DT)
    expect(next.state).toBe('idle')
    expect(next.body.vel.x).toBe(0)
  })

  it('jump impulse leaves the ground', () => {
    const next = stepPlayer(grounded(), { ...NONE, jump: true }, [GROUND], DT)
    expect(next.state).toBe('jump')
    expect(next.body.grounded).toBe(false)
    expect(next.body.vel.y).toBeLessThan(0)
  })

  it('cannot double jump', () => {
    const jumped = stepPlayer(grounded(), { ...NONE, jump: true }, [GROUND], DT)
    const again = stepPlayer(jumped, { ...NONE, jump: true }, [GROUND], DT)
    // No fresh impulse: gravity has reduced the upward speed (less negative).
    expect(again.body.vel.y).toBeGreaterThan(jumped.body.vel.y)
    expect(again.body.vel.y).toBeGreaterThan(-JUMP_IMPULSE)
  })

  it('lands after jump', () => {
    let p = stepPlayer(grounded(), { ...NONE, jump: true }, [GROUND], DT)
    for (let i = 0; i < 120 && !p.body.grounded; i++) {
      p = stepPlayer(p, NONE, [GROUND], DT)
    }
    expect(p.body.grounded).toBe(true)
    expect(p.state).toBe('idle')
  })

  it('crouches', () => {
    const start = grounded()
    const next = stepPlayer(start, { ...NONE, down: true }, [GROUND], DT)
    expect(next.state).toBe('crouch')
    expect(next.body.pos.x).toBe(start.body.pos.x)
  })

  it('is deterministic across identical runs', () => {
    const a = stepPlayer(grounded(), { ...NONE, right: true }, [GROUND], DT)
    const b = stepPlayer(grounded(), { ...NONE, right: true }, [GROUND], DT)
    expect(a).toEqual(b)
  })
})
