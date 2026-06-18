import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { createZombie, hitEnemy, stepZombie, ZOMBIE } from './zombie'

const DT = 1 / 60
const GROUND = aabb(0, 200, 400, 40)
const GROUND_Y = 200

describe('zombie', () => {
  it('stays rising briefly', () => {
    const z = stepZombie(createZombie(100, GROUND_Y), 0, [GROUND], DT)
    expect(z.state).toBe('rising')
    expect(z.body.vel.x).toBe(0)
  })

  it('walks after rising', () => {
    let z = createZombie(100, GROUND_Y)
    const steps = Math.ceil(ZOMBIE.riseSeconds / DT) + 1
    for (let i = 0; i < steps; i++) z = stepZombie(z, 0, [GROUND], DT)
    expect(z.state).toBe('walking')
  })

  it('walks toward player (to the left)', () => {
    let z = createZombie(200, GROUND_Y)
    const steps = Math.ceil(ZOMBIE.riseSeconds / DT) + 1
    for (let i = 0; i < steps; i++) z = stepZombie(z, 0, [GROUND], DT) // player far left
    const before = z.body.pos.x
    z = stepZombie(z, 0, [GROUND], DT)
    expect(z.facing).toBe(-1)
    expect(z.body.pos.x).toBeLessThan(before)
  })

  it('walks toward player (to the right)', () => {
    let z = createZombie(100, GROUND_Y)
    const steps = Math.ceil(ZOMBIE.riseSeconds / DT) + 1
    for (let i = 0; i < steps; i++) z = stepZombie(z, 400, [GROUND], DT) // player far right
    const before = z.body.pos.x
    z = stepZombie(z, 400, [GROUND], DT)
    expect(z.facing).toBe(1)
    expect(z.body.pos.x).toBeGreaterThan(before)
  })

  it('dies when HP hits 0', () => {
    const z = hitEnemy(createZombie(100, GROUND_Y))
    expect(z.hp).toBe(0)
    expect(z.state).toBe('dead')
  })

  it('dead does not move', () => {
    const dead = hitEnemy(createZombie(100, GROUND_Y))
    const stepped = stepZombie(dead, 0, [GROUND], DT)
    expect(stepped.body.pos).toEqual(dead.body.pos)
  })

  it('is deterministic', () => {
    const a = stepZombie(createZombie(100, GROUND_Y), 0, [GROUND], DT)
    const b = stepZombie(createZombie(100, GROUND_Y), 0, [GROUND], DT)
    expect(a).toEqual(b)
  })
})
