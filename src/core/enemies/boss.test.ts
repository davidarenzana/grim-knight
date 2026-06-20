import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { hitEnemy } from './enemy'
import { BOSS, BOSS_VARIANTS, createBoss, stepBoss } from './boss'

const DT = 1 / 60
const GROUND = aabb(0, 410, 800, 40)
const GROUND_Y = 410
const left = { x: 0, y: GROUND_Y }

describe('boss', () => {
  it('advances toward the player', () => {
    const b = createBoss(600, GROUND_Y)
    const next = stepBoss(b, left, [GROUND], DT)
    expect(next.enemy.facing).toBe(-1)
    expect(next.enemy.body.pos.x).toBeLessThan(b.body.pos.x)
  })

  it('is tanky (many hits to kill)', () => {
    let b = createBoss(600, GROUND_Y)
    expect(BOSS.hp).toBeGreaterThan(5)
    for (let i = 0; i < BOSS.hp - 1; i++) b = hitEnemy(b)
    expect(b.state).not.toBe('dead')
    b = hitEnemy(b)
    expect(b.state).toBe('dead')
  })

  it('fires a three-way spread on its cadence', () => {
    const { fired } = stepBoss(createBoss(600, GROUND_Y), left, [GROUND], BOSS.fireInterval + 0.01)
    expect(fired).toHaveLength(3)
    // Spread covers up, straight and down.
    const vys = fired.map((p) => p.vel.y).sort((a, c) => a - c)
    expect(vys[0]!).toBeLessThan(0)
    expect(vys[1]!).toBe(0)
    expect(vys[2]!).toBeGreaterThan(0)
    // All travelling toward the player (left).
    expect(fired.every((p) => p.vel.x < 0)).toBe(true)
    // All carry the fireball art tag for the engine.
    expect(fired.every((p) => p.sprite === 'fire')).toBe(true)
  })

  it('does not fire before its cadence', () => {
    const { fired } = stepBoss(createBoss(600, GROUND_Y), left, [GROUND], DT)
    expect(fired).toHaveLength(0)
  })

  it('defaults to variant 1', () => {
    expect(createBoss(600, GROUND_Y).variant).toBe(1)
  })

  it('escalates across variants (tougher, wider volley)', () => {
    expect(BOSS_VARIANTS[2].hp).toBeGreaterThan(BOSS_VARIANTS[1].hp)
    expect(BOSS_VARIANTS[3].hp).toBeGreaterThan(BOSS_VARIANTS[2].hp)
    expect(BOSS_VARIANTS[3].spread.length).toBeGreaterThan(BOSS_VARIANTS[1].spread.length)
    expect(BOSS_VARIANTS[3].fireInterval).toBeLessThan(BOSS_VARIANTS[1].fireInterval)
  })

  it('fires the variant-specific volley size and carries its HP', () => {
    const b3 = createBoss(600, GROUND_Y, 3)
    expect(b3.variant).toBe(3)
    expect(b3.hp).toBe(BOSS_VARIANTS[3].hp)
    const { fired } = stepBoss(b3, left, [GROUND], BOSS_VARIANTS[3].fireInterval + 0.01)
    expect(fired).toHaveLength(BOSS_VARIANTS[3].spread.length)
  })
})
