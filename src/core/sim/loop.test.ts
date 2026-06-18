import { describe, expect, it } from 'vitest'
import { createStepper } from './loop'

const DT = 1 / 60

describe('loop', () => {
  it('one fixed step: advancing exactly dt steps once, alpha ~0', () => {
    const stepper = createStepper(DT)
    let calls = 0
    const alpha = stepper.advance(DT, () => calls++)
    expect(calls).toBe(1)
    expect(alpha).toBeCloseTo(0, 5)
  })

  it('partial frame: advancing half dt steps zero times, alpha ~0.5', () => {
    const stepper = createStepper(DT)
    let calls = 0
    const alpha = stepper.advance(DT * 0.5, () => calls++)
    expect(calls).toBe(0)
    expect(alpha).toBeCloseTo(0.5, 5)
  })

  it('multiple steps: advancing 2.5*dt steps twice, alpha ~0.5', () => {
    const stepper = createStepper(DT)
    let calls = 0
    const alpha = stepper.advance(DT * 2.5, () => calls++)
    expect(calls).toBe(2)
    expect(alpha).toBeCloseTo(0.5, 5)
  })

  it('carries leftover: 0.5*dt then 0.6*dt steps once across frames', () => {
    const stepper = createStepper(DT)
    let calls = 0
    stepper.advance(DT * 0.5, () => calls++)
    expect(calls).toBe(0)
    stepper.advance(DT * 0.6, () => calls++)
    expect(calls).toBe(1)
  })

  it('clamps to maxSteps to avoid the spiral of death', () => {
    const stepper = createStepper(DT, 5)
    let calls = 0
    stepper.advance(DT * 100, () => calls++)
    expect(calls).toBe(5)
  })

  it('alpha is always in [0, 1)', () => {
    const stepper = createStepper(DT)
    for (const factor of [0.1, 0.9, 1.0, 1.7, 3.3]) {
      const alpha = stepper.advance(DT * factor, () => {})
      expect(alpha).toBeGreaterThanOrEqual(0)
      expect(alpha).toBeLessThan(1)
    }
  })
})
