import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { hitEnemy } from './enemy'
import { createOgre, OGRE, stepOgre } from './ogre'

const DT = 1 / 60
const GROUND = aabb(0, 200, 400, 40)
const GROUND_Y = 200

describe('ogre', () => {
  it('starts walking (no rising)', () => {
    expect(createOgre(100, GROUND_Y).state).toBe('walking')
  })

  it('walks toward the player and faces it', () => {
    const o = createOgre(200, GROUND_Y)
    const next = stepOgre(o, { x: 0, y: GROUND_Y }, [GROUND], DT)
    expect(next.facing).toBe(-1)
    expect(next.body.pos.x).toBeLessThan(o.body.pos.x)
  })

  it('takes several hits to die', () => {
    let o = createOgre(100, GROUND_Y)
    expect(OGRE.hp).toBeGreaterThan(1)
    for (let i = 0; i < OGRE.hp - 1; i++) o = hitEnemy(o)
    expect(o.state).not.toBe('dead')
    o = hitEnemy(o)
    expect(o.state).toBe('dead')
  })

  it('is grounded by gravity', () => {
    let o = createOgre(100, GROUND_Y)
    for (let i = 0; i < 10; i++) o = stepOgre(o, { x: 100, y: GROUND_Y }, [GROUND], DT)
    expect(o.body.grounded).toBe(true)
  })
})
