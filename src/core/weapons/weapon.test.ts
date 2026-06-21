import { describe, expect, it } from 'vitest'
import {
  advanceProjectilesDetailed,
  AXE,
  createWeapon,
  DAGGER,
  fire,
  LANCE,
  nextWeapon,
  nextOwnedWeapon,
  stepWeapon,
  TORCH,
  weaponById,
  WEAPONS,
  type WeaponState,
} from './weapon'

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

  it('reports the cull reason: wall vs out-of-bounds', () => {
    const wall = { x: 100, y: 0, w: 20, h: 200 }
    const intoWall = { pos: { x: 96, y: 50 }, vel: { x: 360, y: 0 }, w: 16, h: 4 }
    const offRight = { pos: { x: 790, y: 50 }, vel: { x: 360, y: 0 }, w: 16, h: 4 }
    const r = advanceProjectilesDetailed([intoWall, offRight], 0.05, BOUNDS, [wall])
    expect(r.alive).toHaveLength(0)
    expect(r.culled.map((c) => c.reason).sort()).toEqual(['bounds', 'wall'])
    const wallHit = r.culled.find((c) => c.reason === 'wall')!
    expect(wallHit.projectile.pos.x).toBeGreaterThan(96) // last position, at the wall
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

  it('arcing weapons fall under gravity (rise then drop below launch height)', () => {
    let w = fire(createWeapon(), AXE, 100, 100, 1)
    expect(w.projectiles[0]!.vel.y).toBeLessThan(0) // launched upward
    // Step until the arc passes its apex and falls back below the launch height.
    let belowLaunch = false
    for (let i = 0; i < 120 && !belowLaunch; i++) {
      w = stepWeapon(w, 1 / 60, { minX: -1e6, maxX: 1e6 })
      const p = w.projectiles[0]
      if (p && p.vel.y > 0 && p.pos.y > 100) belowLaunch = true
    }
    expect(belowLaunch).toBe(true)
  })

  it('straight weapons stay flat (no vertical velocity)', () => {
    let w = fire(createWeapon(), LANCE, 100, 50, 1)
    w = stepWeapon(w, 0.2, BOUNDS)
    expect(w.projectiles[0]!.vel.y).toBe(0)
    expect(w.projectiles[0]!.pos.y).toBe(50)
  })

  it('culls projectiles past their max range even while on screen', () => {
    const w = fire(createWeapon(), DAGGER, 400, 50, 1)
    // DAGGER has a short reach; after enough travel it should be culled mid-screen.
    let stepped = w
    for (let i = 0; i < 60; i++) stepped = stepWeapon(stepped, 1 / 60, BOUNDS)
    expect(stepped.projectiles).toHaveLength(0)
  })

  it('registry cycles through all weapons and resolves by id', () => {
    expect(WEAPONS.length).toBeGreaterThanOrEqual(4)
    expect(weaponById(TORCH.id)).toBe(TORCH)
    const ids = new Set<string>()
    let cur = LANCE
    for (let i = 0; i < WEAPONS.length; i++) {
      ids.add(cur.id)
      cur = nextWeapon(cur)
    }
    expect(ids.size).toBe(WEAPONS.length) // visited each exactly once
    expect(cur).toBe(LANCE) // wrapped back around
  })

  it('nextOwnedWeapon cycles only the owned ids, wrapping around', () => {
    const owned = [DAGGER.id, TORCH.id]
    expect(nextOwnedWeapon(DAGGER.id, owned).id).toBe(TORCH.id)
    expect(nextOwnedWeapon(TORCH.id, owned).id).toBe(DAGGER.id) // wraps, skips axe/lance
    // The axe isn't owned yet, so it's never reached by swapping.
    expect([DAGGER.id, TORCH.id]).not.toContain(AXE.id)
  })

  it('nextOwnedWeapon falls back to the current weapon when nothing is owned', () => {
    expect(nextOwnedWeapon(DAGGER.id, []).id).toBe(DAGGER.id)
  })
})
