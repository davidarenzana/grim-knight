import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { hitEnemy, type Enemy } from '@core/enemies/enemy'
import { createZombie } from '@core/enemies/zombie'
import type { Projectile } from '@core/weapons/weapon'
import { resolveCombat } from './combat'

const GROUND_Y = 200
const FAR = aabb(-1000, -1000, 1, 1) // player box well out of the way

// A projectile centered on the zombie at (x, GROUND_Y).
const projAt = (x: number, y: number): Projectile => ({
  pos: { x, y },
  vel: { x: 360, y: 0 },
  w: 16,
  h: 4,
})

describe('combat', () => {
  it('projectile kills enemy and is consumed', () => {
    const z = createZombie(100, GROUND_Y)
    const p = projAt(z.body.pos.x, z.body.pos.y)
    const res = resolveCombat(FAR, [p], [z])
    expect(res.projectiles).toHaveLength(0)
    expect(res.enemies[0]!.state).toBe('dead')
    expect(res.kills).toBe(1)
  })

  it('projectile misses: survives, no damage', () => {
    const z = createZombie(100, GROUND_Y)
    const p = projAt(300, 50) // nowhere near
    const res = resolveCombat(FAR, [p], [z])
    expect(res.projectiles).toHaveLength(1)
    expect(res.enemies[0]!.state).not.toBe('dead')
    expect(res.kills).toBe(0)
  })

  it('one enemy per projectile', () => {
    const a = createZombie(100, GROUND_Y)
    const b = createZombie(100, GROUND_Y) // overlapping a
    const p = projAt(a.body.pos.x, a.body.pos.y)
    const res = resolveCombat(FAR, [p], [a, b])
    const damaged = res.enemies.filter((e) => e.state === 'dead')
    expect(damaged).toHaveLength(1)
  })

  it('ignores dead enemies', () => {
    const dead: Enemy = hitEnemy(createZombie(100, GROUND_Y))
    const alive = createZombie(100, GROUND_Y)
    const p = projAt(alive.body.pos.x, alive.body.pos.y)
    const res = resolveCombat(FAR, [p], [dead, alive])
    expect(res.enemies[1]!.state).toBe('dead') // the living one got hit
    expect(res.kills).toBe(1)
  })

  it('enemy overlapping the player flags player hit', () => {
    const z = createZombie(100, GROUND_Y)
    const playerBox = aabb(z.body.pos.x, z.body.pos.y, 24, 48)
    const res = resolveCombat(playerBox, [], [z])
    expect(res.playerHit).toBe(true)
  })

  it('no player hit when enemies are away', () => {
    const z = createZombie(100, GROUND_Y)
    const res = resolveCombat(FAR, [], [z])
    expect(res.playerHit).toBe(false)
  })
})
