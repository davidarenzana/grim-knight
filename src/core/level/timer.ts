/**
 * Stage countdown timer. Pure core: a deterministic function of `dt`.
 * The engine turns an expiry into a lost life (classic time-out rule).
 */
export interface StageTimer {
  readonly secondsLeft: number
  readonly duration: number
}

export const createTimer = (seconds: number): StageTimer => ({
  secondsLeft: seconds,
  duration: seconds,
})

export interface TimerStep {
  readonly timer: StageTimer
  /** True only on the step the timer reaches zero. */
  readonly expired: boolean
}

export const tickTimer = (t: StageTimer, dt: number): TimerStep => {
  if (t.secondsLeft <= 0) return { timer: t, expired: false }
  const secondsLeft = Math.max(0, t.secondsLeft - dt)
  return { timer: { ...t, secondsLeft }, expired: secondsLeft <= 0 }
}
