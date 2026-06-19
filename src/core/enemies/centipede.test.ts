import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { hitEnemy } from './enemy'
import { CENTIPEDE, createCentipede, stepCentipede } from './centipede'
import { ZOMBIE } from './zombie'

const DT = 1 / 60
const GROUND = aabb(0, 200, 400, 40)
const GROUND_Y = 200

describe('centipede', () => {
  it('starts walking (no rising)', () => {
    expect(createCentipede(100, GROUND_Y).state).toBe('walking')
  })

  it('walks toward the player and faces it', () => {
    const c = createCentipede(200, GROUND_Y)
    const next = stepCentipede(c, { x: 0, y: GROUND_Y }, [GROUND], DT)
    expect(next.facing).toBe(-1)
    expect(next.body.pos.x).toBeLessThan(c.body.pos.x)
  })

  it('is faster than the zombie', () => {
    expect(CENTIPEDE.speed).toBeGreaterThan(ZOMBIE.speed)
  })

  it('dies in a single hit (fragile)', () => {
    expect(CENTIPEDE.hp).toBe(1)
    expect(hitEnemy(createCentipede(100, GROUND_Y)).state).toBe('dead')
  })

  it('is grounded by gravity', () => {
    let c = createCentipede(100, GROUND_Y)
    for (let i = 0; i < 10; i++) c = stepCentipede(c, { x: 100, y: GROUND_Y }, [GROUND], DT)
    expect(c.body.grounded).toBe(true)
  })

  it('dead centipedes do not move', () => {
    const dead = { ...createCentipede(100, GROUND_Y), state: 'dead' as const }
    const next = stepCentipede(dead, { x: 0, y: GROUND_Y }, [GROUND], DT)
    expect(next.body.pos.x).toBe(dead.body.pos.x)
  })
})
