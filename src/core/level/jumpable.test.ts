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

  // Only the hell theme paints hazards as lava; every other theme renders them as
  // spikes (engine `hazardKey`). Spikes are a thin 16px surface strip while lava
  // is a tall recessed pool — so authoring a `lava()` hazard outside hell makes a
  // lava box get painted with the spikes texture (a visual mismatch). Guard it.
  for (const level of LEVELS) {
    if (level.theme === 'hell') continue
    it(`"${level.name}" authors spikes-shaped hazards (no lava outside hell)`, () => {
      for (const h of level.hazards ?? []) {
        expect(
          h.h,
          `hazard at x=${h.x} in ${level.name} is lava-shaped (renders wrong)`,
        ).toBeLessThanOrEqual(16)
      }
    })
  }
})
