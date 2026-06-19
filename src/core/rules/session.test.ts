import { describe, expect, it } from 'vitest'
import { addScore, createSession, gainLife, loseLife, STARTING_LIVES, win } from './session'

describe('session', () => {
  it('starts fresh', () => {
    const s = createSession()
    expect(s).toEqual({ lives: STARTING_LIVES, score: 0, state: 'playing' })
  })

  it('adds score', () => {
    expect(addScore(createSession(), 100).score).toBe(100)
  })

  it('loses a life (still playing)', () => {
    const s = loseLife(createSession())
    expect(s.lives).toBe(STARTING_LIVES - 1)
    expect(s.state).toBe('playing')
  })

  it('game over on the last life', () => {
    let s = createSession()
    for (let i = 0; i < STARTING_LIVES; i++) s = loseLife(s)
    expect(s.lives).toBe(0)
    expect(s.state).toBe('gameover')
  })

  it('no score after game over', () => {
    let s = createSession()
    for (let i = 0; i < STARTING_LIVES; i++) s = loseLife(s)
    expect(addScore(s, 500).score).toBe(0)
  })

  it('win sets state to won', () => {
    expect(win(createSession()).state).toBe('won')
  })

  it('cannot lose a life after game over', () => {
    let s = createSession()
    for (let i = 0; i < STARTING_LIVES + 2; i++) s = loseLife(s)
    expect(s.lives).toBe(0)
  })

  it('gains an extra life', () => {
    expect(gainLife(createSession()).lives).toBe(STARTING_LIVES + 1)
  })

  it('cannot gain a life after game over', () => {
    let s = createSession()
    for (let i = 0; i < STARTING_LIVES; i++) s = loseLife(s)
    expect(gainLife(s).lives).toBe(0)
  })
})
