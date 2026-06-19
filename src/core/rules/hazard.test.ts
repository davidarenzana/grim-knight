import { describe, expect, it } from 'vitest'
import { aabb } from '@core/math/aabb'
import { touchesHazard } from './hazard'

const player = aabb(100, 100, 24, 48)
const lava = aabb(90, 140, 80, 20)
const farSpikes = aabb(400, 100, 40, 20)

describe('hazard contact', () => {
  it('is hit while overlapping a hazard', () => {
    expect(touchesHazard(player, [lava])).toBe(true)
  })

  it('is safe when clear of every hazard', () => {
    expect(touchesHazard(player, [farSpikes])).toBe(false)
  })

  it('is safe with no hazards', () => {
    expect(touchesHazard(player, [])).toBe(false)
  })

  it('is hit if any one of several hazards overlaps', () => {
    expect(touchesHazard(player, [farSpikes, lava])).toBe(true)
  })
})
