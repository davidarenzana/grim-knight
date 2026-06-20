import { describe, expect, it } from 'vitest'
import { hitEnemy } from './enemy'
import { BLOATED, createBloated, stepBloated } from './bloated'

const GROUND_Y = 200
const DT = 1 / 60

const run = (steps: number, playerX: number) => {
  let b = createBloated(200, GROUND_Y)
  const fired = []
  for (let i = 0; i < steps; i++) {
    const r = stepBloated(b, { x: playerX, y: GROUND_Y }, DT)
    b = r.enemy
    fired.push(...r.fired)
  }
  return { bloated: b, fired }
}

describe('bloated', () => {
  it('does not move (stationary caster)', () => {
    const b = createBloated(200, GROUND_Y)
    const next = stepBloated(b, { x: 0, y: GROUND_Y }, DT).enemy
    expect(next.body.pos.x).toBe(b.body.pos.x)
  })

  it('faces the player', () => {
    expect(stepBloated(createBloated(200, GROUND_Y), { x: 0, y: GROUND_Y }, DT).enemy.facing).toBe(
      -1,
    )
  })

  it('lobs an arcing bolt: launched upward, with downward gravity', () => {
    const { fired } = run(Math.ceil(BLOATED.fireInterval / DT) + 1, 0)
    expect(fired.length).toBeGreaterThanOrEqual(1)
    expect(fired[0]!.vel.x).toBeLessThan(0) // toward the player (left)
    expect(fired[0]!.vel.y).toBeLessThan(0) // launched upward
    expect(fired[0]!.ay ?? 0).toBeGreaterThan(0) // falls back down (arc)
    expect(fired[0]!.sprite).toBe('bolt') // art tag for the engine
  })

  it('does not fire before its interval elapses', () => {
    const { fired } = run(Math.floor(BLOATED.fireInterval / DT) - 2, 0)
    expect(fired).toHaveLength(0)
  })

  it('takes two hits to die', () => {
    expect(BLOATED.hp).toBe(2)
    let b = createBloated(100, GROUND_Y)
    b = hitEnemy(b)
    expect(b.state).not.toBe('dead')
    expect(hitEnemy(b).state).toBe('dead')
  })

  it('dead bloated neither fires nor advances age', () => {
    const dead = { ...createBloated(100, GROUND_Y), state: 'dead' as const }
    const r = stepBloated(dead, { x: 0, y: GROUND_Y }, DT)
    expect(r.fired).toHaveLength(0)
    expect(r.enemy.age).toBe(dead.age)
  })
})
