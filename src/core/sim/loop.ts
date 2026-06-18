/**
 * Fixed-timestep stepper (see ADR 0002).
 *
 * Consumes real frame time and advances the simulation in fixed `dt` steps,
 * returning an interpolation `alpha` for the render. Guards against the
 * "spiral of death" by capping steps per frame. Pure core: no wall-clock time
 * inside — the real delta is passed into `advance`.
 */
export interface Stepper {
  /**
   * Advance by `realDeltaSeconds`, calling `step` once per consumed fixed dt.
   * Returns the interpolation factor `alpha` in [0, 1) for rendering.
   */
  advance(realDeltaSeconds: number, step: () => void): number
}

export const createStepper = (fixedDt: number, maxSteps = 5): Stepper => {
  if (fixedDt <= 0) throw new Error('createStepper: fixedDt must be > 0')
  let accumulator = 0

  const advance = (realDeltaSeconds: number, step: () => void): number => {
    accumulator += Math.max(0, realDeltaSeconds)

    let steps = 0
    while (accumulator >= fixedDt && steps < maxSteps) {
      step()
      accumulator -= fixedDt
      steps++
    }

    // If we hit the cap, drop the backlog so alpha stays in [0, 1).
    if (accumulator >= fixedDt) accumulator = accumulator % fixedDt

    return accumulator / fixedDt
  }

  return { advance }
}
