import { describe, expect, it } from 'vitest'
import { hasFallenOut } from './fall'

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
