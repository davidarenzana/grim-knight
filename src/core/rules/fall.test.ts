import { describe, expect, it } from 'vitest'
import { hasFallenOut, hasSunkUnderFloor } from './fall'

const at = (y: number) => ({ pos: { x: 0, y } })

describe('fall-out rule', () => {
  it('is false while the body is above the death line', () => {
    expect(hasFallenOut(at(300), 490)).toBe(false)
  })

  it('is false exactly at the death line (must pass it)', () => {
    expect(hasFallenOut(at(490), 490)).toBe(false)
  })

  it('is true once the body drops below the death line', () => {
    expect(hasFallenOut(at(491), 490)).toBe(true)
  })
})

describe('sunk-under-floor safety net', () => {
  const GROUND_Y = 410
  it('is false for an enemy standing on top of the ground', () => {
    expect(hasSunkUnderFloor(at(388), GROUND_Y)).toBe(false) // shortest enemy top
  })

  it('is false for an enemy elevated on a platform/pillar', () => {
    expect(hasSunkUnderFloor(at(320), GROUND_Y)).toBe(false)
  })

  it('is true once the top edge drops below the ground surface', () => {
    expect(hasSunkUnderFloor(at(430), GROUND_Y)).toBe(true)
  })
})
