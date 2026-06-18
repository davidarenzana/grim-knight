import { describe, expect, it } from 'vitest'
import { createWeapon, fire, LANCE, stepWeapon, type WeaponState } from './weapon'

const BOUNDS = { minX: 0, maxX: 800 }

describe('weapon', () => {
  it('fire spawns projectile moving in facing direction and sets cooldown', () => {
    const w = fire(createWeapon(), LANCE, 100, 50, 1)
    expect(w.projectiles).toHaveLength(1)
    expect(w.projectiles[0]!.vel.x).toBe(LANCE.speed)
    expect(w.cooldownLeft).toBe(LANCE.cooldown)
  })

  it('fires left when facing left', () => {
    const w = fire(createWeapon(), LANCE, 100, 50, -1)
    expect(w.projectiles[0]!.vel.x).toBe(-LANCE.speed)
  })

  it('cannot fire on cooldown', () => {
    const w1 = fire(createWeapon(), LANCE, 100, 50, 1)
    const w2 = fire(w1, LANCE, 100, 50, 1)
    expect(w2.projectiles).toHaveLength(1)
  })

  it('respects maxOnScreen', () => {
    // Two projectiles already present, cooldown clear.
    const full: WeaponState = {
      cooldownLeft: 0,
      projectiles: [
        { pos: { x: 1, y: 0 }, vel: { x: 1, y: 0 }, w: 16, h: 4 },
        { pos: { x: 2, y: 0 }, vel: { x: 1, y: 0 }, w: 16, h: 4 },
      ],
    }
    const w = fire(full, LANCE, 100, 50, 1)
    expect(w.projectiles).toHaveLength(2)
  })

  it('step moves projectiles and decays cooldown', () => {
    const w0 = fire(createWeapon(), LANCE, 100, 50, 1)
    const w1 = stepWeapon(w0, 0.1, BOUNDS)
    expect(w1.projectiles[0]!.pos.x).toBeCloseTo(100 + LANCE.speed * 0.1, 5)
    expect(w1.cooldownLeft).toBeCloseTo(LANCE.cooldown - 0.1, 5)
  })

  it('cooldown never goes below zero', () => {
    const w = stepWeapon(fire(createWeapon(), LANCE, 100, 50, 1), 10, BOUNDS)
    expect(w.cooldownLeft).toBe(0)
  })

  it('culls projectiles out of bounds', () => {
    const w: WeaponState = {
      cooldownLeft: 0,
      projectiles: [{ pos: { x: 799, y: 0 }, vel: { x: 360, y: 0 }, w: 16, h: 4 }],
    }
    const stepped = stepWeapon(w, 0.5, BOUNDS)
    expect(stepped.projectiles).toHaveLength(0)
  })

  it('culls projectiles that hit a solid wall', () => {
    const wall = { x: 100, y: 0, w: 20, h: 200 }
    const w: WeaponState = {
      cooldownLeft: 0,
      projectiles: [{ pos: { x: 96, y: 50 }, vel: { x: 360, y: 0 }, w: 16, h: 4 }],
    }
    const stepped = stepWeapon(w, 0.05, BOUNDS, [wall])
    expect(stepped.projectiles).toHaveLength(0)
  })

  it('lets projectiles pass through one-way platforms', () => {
    const platform = { x: 100, y: 0, w: 200, h: 20, oneWay: true }
    const w: WeaponState = {
      cooldownLeft: 0,
      projectiles: [{ pos: { x: 150, y: 5 }, vel: { x: 360, y: 0 }, w: 16, h: 4 }],
    }
    const stepped = stepWeapon(w, 0.05, BOUNDS, [platform])
    expect(stepped.projectiles).toHaveLength(1)
  })
})
