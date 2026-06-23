import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { hitEnemy } from './enemy'
import { createTurtle, stepTurtle, TURTLE } from './turtle'

const GROUND = aabb(0, 200, 400, 40)
const GROUND_Y = 200
const DT = 1 / 60

/** Run `steps` of stepTurtle from the player position, collecting fired shots. */
const run = (steps: number, playerX: number) => {
  let t = createTurtle(200, GROUND_Y)
  const fired = []
  for (let i = 0; i < steps; i++) {
    const r = stepTurtle(t, { x: playerX, y: GROUND_Y }, [GROUND], DT)
    t = r.enemy
    fired.push(...r.fired)
  }
  return { turtle: t, fired }
}

describe('turtle', () => {
  it('walks slowly toward the player and faces it', () => {
    const t = createTurtle(200, GROUND_Y)
    const next = stepTurtle(t, { x: 0, y: GROUND_Y }, [GROUND], DT).enemy
    expect(next.facing).toBe(-1)
    expect(next.body.pos.x).toBeLessThan(t.body.pos.x)
  })

  it('fires a straight, horizontal bullet toward the player', () => {
    // Player to the left → bullet travels left, flat (vy 0).
    const { fired } = run(Math.ceil(TURTLE.fireInterval / DT) + 1, 0)
    expect(fired.length).toBeGreaterThanOrEqual(1)
    expect(fired[0]!.vel.x).toBeLessThan(0)
    expect(fired[0]!.vel.y).toBe(0)
    expect(fired[0]!.ay ?? 0).toBe(0)
    expect(fired[0]!.sprite).toBe('bullet') // art tag for the engine
  })

  it('does not fire before its interval elapses', () => {
    const { fired } = run(Math.floor(TURTLE.fireInterval / DT) - 2, 0)
    expect(fired).toHaveLength(0)
  })

  it('takes several hits to die (armored)', () => {
    let t = createTurtle(100, GROUND_Y)
    expect(TURTLE.hp).toBeGreaterThan(1)
    for (let i = 0; i < TURTLE.hp - 1; i++) t = hitEnemy(t)
    expect(t.state).not.toBe('dead')
    expect(hitEnemy(t).state).toBe('dead')
  })

  it('ignores a player on another lane: holds fire and just patrols', () => {
    // Player far below (a different lane) for well past a fire interval.
    let t = createTurtle(200, GROUND_Y)
    const fired = []
    for (let i = 0; i < Math.ceil(TURTLE.fireInterval / DT) + 2; i++) {
      const r = stepTurtle(t, { x: 0, y: GROUND_Y + 400 }, [GROUND], DT)
      t = r.enemy
      fired.push(...r.fired)
    }
    expect(fired).toHaveLength(0) // off-lane → never locks on, never fires
  })

  it('dead turtles neither move nor fire', () => {
    const dead = { ...createTurtle(100, GROUND_Y), state: 'dead' as const }
    const r = stepTurtle(dead, { x: 0, y: GROUND_Y }, [GROUND], DT)
    expect(r.fired).toHaveLength(0)
    expect(r.enemy.body.pos.x).toBe(dead.body.pos.x)
  })
})
