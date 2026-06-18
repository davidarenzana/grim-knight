import { describe, expect, it } from 'vitest'
import { createArmor, hit, INVULN_SECONDS, pickupArmor, tick } from './armor'

describe('armor', () => {
  it('first hit -> underwear (still alive)', () => {
    const a = hit(createArmor())
    expect(a.state).toBe('underwear')
  })

  it('second hit -> dead', () => {
    // Tick past i-frames between hits so the second one lands.
    let a = hit(createArmor())
    a = tick(a, INVULN_SECONDS)
    a = hit(a)
    expect(a.state).toBe('dead')
  })

  it('pickup -> armored from underwear', () => {
    let a = hit(createArmor())
    a = pickupArmor(a)
    expect(a.state).toBe('armored')
  })

  it('damage while dead is a no-op', () => {
    const dead = { state: 'dead', iFramesLeft: 0 } as const
    expect(hit(dead)).toEqual(dead)
  })

  it('ignores hits during i-frames', () => {
    const a = hit(createArmor()) // now in i-frames
    const again = hit(a)
    expect(again.state).toBe('underwear') // unchanged
  })

  it('pickup while dead stays dead', () => {
    const dead = { state: 'dead', iFramesLeft: 0 } as const
    expect(pickupArmor(dead)).toEqual(dead)
  })

  it('tick decrements i-frames and never goes negative', () => {
    const a = hit(createArmor())
    expect(tick(a, INVULN_SECONDS + 1).iFramesLeft).toBe(0)
  })
})
