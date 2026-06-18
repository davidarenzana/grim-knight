import { describe, expect, it } from 'vitest'
import { hitEnemy } from './enemy'
import { createPlant, PLANT, stepPlant } from './plant'

const GROUND_Y = 200
const target = { x: 0, y: GROUND_Y } // player to the left

describe('plant', () => {
  it('starts active and stationary', () => {
    const p = createPlant(300, GROUND_Y)
    const next = stepPlant(p, target, 0.1)
    expect(next.enemy.state).toBe('walking')
    expect(next.enemy.body.pos).toEqual(p.body.pos) // does not move
  })

  it('does not fire before the interval', () => {
    const { fired } = stepPlant(createPlant(300, GROUND_Y), target, PLANT.fireInterval - 0.1)
    expect(fired).toHaveLength(0)
  })

  it('fires a projectile toward the player after the interval', () => {
    const { fired } = stepPlant(createPlant(300, GROUND_Y), target, PLANT.fireInterval + 0.01)
    expect(fired).toHaveLength(1)
    expect(fired[0]!.vel.x).toBeLessThan(0) // player is to the left
  })

  it('fires to the right when the player is on the right', () => {
    const { fired } = stepPlant(
      createPlant(100, GROUND_Y),
      { x: 700, y: GROUND_Y },
      PLANT.fireInterval + 0.01,
    )
    expect(fired[0]!.vel.x).toBeGreaterThan(0)
  })

  it('takes two hits to die', () => {
    let p = createPlant(300, GROUND_Y)
    p = hitEnemy(p)
    expect(p.state).not.toBe('dead')
    p = hitEnemy(p)
    expect(p.state).toBe('dead')
  })

  it('is deterministic', () => {
    const a = stepPlant(createPlant(300, GROUND_Y), target, 2.1)
    const b = stepPlant(createPlant(300, GROUND_Y), target, 2.1)
    expect(a).toEqual(b)
  })
})
