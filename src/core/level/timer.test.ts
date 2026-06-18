import { describe, expect, it } from 'vitest'
import { createTimer, tickTimer } from './timer'

describe('timer', () => {
  it('counts down', () => {
    const { timer, expired } = tickTimer(createTimer(60), 1)
    expect(timer.secondsLeft).toBe(59)
    expect(expired).toBe(false)
  })

  it('expires once at zero', () => {
    const { timer, expired } = tickTimer(createTimer(0.05), 0.1)
    expect(timer.secondsLeft).toBe(0)
    expect(expired).toBe(true)
  })

  it('does not re-expire and never goes negative', () => {
    const expiredTimer = tickTimer(createTimer(0.05), 0.1).timer
    const next = tickTimer(expiredTimer, 1)
    expect(next.timer.secondsLeft).toBe(0)
    expect(next.expired).toBe(false)
  })

  it('keeps the original duration', () => {
    expect(createTimer(45).duration).toBe(45)
  })
})
