import { describe, expect, it } from 'vitest'
import { LEVELS } from './level'
import { MAX_JUMP_GAP, SAFE_HAZARD_W } from './geometry'

/**
 * Guardrail: a ground hazard (spikes/lava) wider than the player's jump cannot
 * be cleared, so the stage soft-locks. Every authored hazard must stay within
 * the comfortable jump budget. See geometry.ts for how the limits are derived
 * from the player tunables.
 */
describe('hazard jumpability', () => {
  it('keeps the safety budget below the physical jump reach', () => {
    expect(SAFE_HAZARD_W).toBeLessThan(MAX_JUMP_GAP)
  })

  for (const level of LEVELS) {
    it(`"${level.name}" has no un-jumpable hazard`, () => {
      for (const h of level.hazards ?? []) {
        expect(h.w, `hazard at x=${h.x} in ${level.name} is too wide to jump`).toBeLessThanOrEqual(
          SAFE_HAZARD_W,
        )
      }
    })
  }
})
