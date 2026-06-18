import { describe, expect, it } from 'vitest'
import { hitEnemy } from './enemy'
import { createFlyer, stepFlyer } from './flyer'

const DT = 1 / 60
const NO_SOLIDS: never[] = []

describe('flyer', () => {
  it('starts flying', () => {
    expect(createFlyer(100, 100).state).toBe('flying')
  })

  it('chases the player horizontally', () => {
    const f = createFlyer(100, 100)
    const next = stepFlyer(f, { x: 400, y: 100 }, NO_SOLIDS, DT)
    expect(next.facing).toBe(1)
    expect(next.body.pos.x).toBeGreaterThan(f.body.pos.x)
  })

  it('faces left when the player is to the left', () => {
    const f = createFlyer(300, 100)
    const next = stepFlyer(f, { x: 0, y: 100 }, NO_SOLIDS, DT)
    expect(next.facing).toBe(-1)
    expect(next.body.pos.x).toBeLessThan(f.body.pos.x)
  })

  it('climbs toward a player above it (no gravity pull)', () => {
    const f = createFlyer(100, 300)
    const next = stepFlyer(f, { x: 100, y: 0 }, NO_SOLIDS, DT)
    expect(next.body.pos.y).toBeLessThan(f.body.pos.y)
  })

  it('dies when hit', () => {
    expect(hitEnemy(createFlyer(100, 100)).state).toBe('dead')
  })

  it('is deterministic', () => {
    const a = stepFlyer(createFlyer(100, 100), { x: 400, y: 50 }, NO_SOLIDS, DT)
    const b = stepFlyer(createFlyer(100, 100), { x: 400, y: 50 }, NO_SOLIDS, DT)
    expect(a).toEqual(b)
  })
})
