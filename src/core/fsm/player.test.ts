import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import {
  createPlayer,
  JUMP_IMPULSE,
  NO_INPUT,
  PLAYER_H,
  stepPlayer,
  type PlayerInput,
  type PlayerWorld,
} from './player'

const DT = 1 / 60
const GROUND = aabb(0, 200, 400, 40)
const LADDER = aabb(104, 60, 16, 160) // overlaps a player standing at x=100
const WORLD: PlayerWorld = { solids: [GROUND] }
const input = (over: Partial<PlayerInput>): PlayerInput => ({ ...NO_INPUT, ...over })

// A player resting on the ground (one settling step makes `grounded` true).
const grounded = () => stepPlayer(createPlayer(100, 200 - PLAYER_H), NO_INPUT, WORLD, DT)

describe('player', () => {
  it('walks right', () => {
    const start = grounded()
    const next = stepPlayer(start, input({ right: true }), WORLD, DT)
    expect(next.state).toBe('run')
    expect(next.body.pos.x).toBeGreaterThan(start.body.pos.x)
    expect(next.facing).toBe(1)
  })

  it('stops to idle', () => {
    const next = stepPlayer(grounded(), NO_INPUT, WORLD, DT)
    expect(next.state).toBe('idle')
    expect(next.body.vel.x).toBe(0)
  })

  it('jump impulse leaves the ground', () => {
    const next = stepPlayer(grounded(), input({ jump: true }), WORLD, DT)
    expect(next.state).toBe('jump')
    expect(next.body.grounded).toBe(false)
    expect(next.body.vel.y).toBeLessThan(0)
  })

  it('cannot double jump', () => {
    const jumped = stepPlayer(grounded(), input({ jump: true }), WORLD, DT)
    const again = stepPlayer(jumped, input({ jump: true }), WORLD, DT)
    expect(again.body.vel.y).toBeGreaterThan(jumped.body.vel.y)
    expect(again.body.vel.y).toBeGreaterThan(-JUMP_IMPULSE)
  })

  it('lands after jump', () => {
    let p = stepPlayer(grounded(), input({ jump: true }), WORLD, DT)
    for (let i = 0; i < 120 && !p.body.grounded; i++) p = stepPlayer(p, NO_INPUT, WORLD, DT)
    expect(p.body.grounded).toBe(true)
    expect(p.state).toBe('idle')
  })

  it('crouches', () => {
    const start = grounded()
    const next = stepPlayer(start, input({ down: true }), WORLD, DT)
    expect(next.state).toBe('crouch')
    expect(next.body.pos.x).toBe(start.body.pos.x)
  })

  it('is deterministic across identical runs', () => {
    const a = stepPlayer(grounded(), input({ right: true }), WORLD, DT)
    const b = stepPlayer(grounded(), input({ right: true }), WORLD, DT)
    expect(a).toEqual(b)
  })

  // --- Ladders ---

  const ladderWorld: PlayerWorld = { solids: [GROUND], ladders: [LADDER] }

  it('climbs up a ladder', () => {
    const start = grounded()
    const next = stepPlayer(start, input({ up: true }), ladderWorld, DT)
    expect(next.state).toBe('climb')
    expect(next.body.pos.y).toBeLessThan(start.body.pos.y)
  })

  it('climbs down', () => {
    let p = stepPlayer(grounded(), input({ up: true }), ladderWorld, DT)
    p = stepPlayer(p, input({ up: true }), ladderWorld, DT)
    const before = p.body.pos.y
    const next = stepPlayer(p, input({ down: true }), ladderWorld, DT)
    expect(next.body.pos.y).toBeGreaterThan(before)
  })

  it('stays on the ladder without input', () => {
    const climbing = stepPlayer(grounded(), input({ up: true }), ladderWorld, DT)
    const next = stepPlayer(climbing, NO_INPUT, ladderWorld, DT)
    expect(next.state).toBe('climb')
    expect(next.body.pos.y).toBe(climbing.body.pos.y)
  })

  it('keeps climbing when jump is pressed on a ladder (up has priority)', () => {
    const climbing = stepPlayer(grounded(), input({ up: true }), ladderWorld, DT)
    const next = stepPlayer(climbing, input({ up: true, jump: true }), ladderWorld, DT)
    expect(next.state).toBe('climb')
  })

  it('no climb without a ladder', () => {
    const next = stepPlayer(grounded(), input({ up: true }), WORLD, DT)
    expect(next.state).not.toBe('climb')
  })

  // --- Damage ---

  it('hurt and knockback on a landed hit', () => {
    const start = grounded() // facing right by default
    const next = stepPlayer(start, NO_INPUT, { solids: [GROUND], damaged: true }, DT)
    expect(next.state).toBe('hurt')
    expect(next.armor.state).toBe('underwear')
    expect(next.body.vel.x).toBeLessThan(0) // knocked away from facing (right)
  })

  it('i-frames block a rapid second hit', () => {
    const hurt = stepPlayer(grounded(), NO_INPUT, { solids: [GROUND], damaged: true }, DT)
    const next = stepPlayer(hurt, NO_INPUT, { solids: [GROUND], damaged: true }, DT)
    expect(next.armor.state).toBe('underwear') // unchanged during i-frames
  })

  it('dies on a fatal hit', () => {
    let p = stepPlayer(grounded(), NO_INPUT, { solids: [GROUND], damaged: true }, DT)
    // Let hurt + i-frames expire.
    for (let i = 0; i < 100; i++) p = stepPlayer(p, NO_INPUT, WORLD, DT)
    p = stepPlayer(p, NO_INPUT, { solids: [GROUND], damaged: true }, DT)
    expect(p.armor.state).toBe('dead')
    expect(p.state).toBe('die')
  })

  it('throw state on attack', () => {
    const next = stepPlayer(grounded(), input({ attack: true }), WORLD, DT)
    expect(next.state).toBe('throw')
    expect(next.throwTimer).toBeGreaterThan(0)
  })
})
