/**
 * Armor rule — the genre's signature 2-hit survivability model.
 * `armored` → (hit) → `underwear` → (hit) → `dead`. An armor pickup restores
 * the suit from any living state. After a hit, brief invulnerability (i-frames)
 * ignores further hits. Pure core: deterministic, time passed in via `dt`.
 */
export type ArmorState = 'armored' | 'underwear' | 'dead'

export interface Armor {
  readonly state: ArmorState
  /** Remaining invulnerability time in seconds (0 = vulnerable). */
  readonly iFramesLeft: number
}

/** Invulnerability window after taking a hit, in seconds (tunable). */
export const INVULN_SECONDS = 1.0

export const createArmor = (): Armor => ({ state: 'armored', iFramesLeft: 0 })

/** Apply one hit, honoring i-frames and the state ladder. */
export const hit = (a: Armor): Armor => {
  if (a.state === 'dead') return a
  if (a.iFramesLeft > 0) return a
  if (a.state === 'armored') return { state: 'underwear', iFramesLeft: INVULN_SECONDS }
  return { state: 'dead', iFramesLeft: 0 }
}

/** Pick up an armor power-up: restores the suit unless already dead. */
export const pickupArmor = (a: Armor): Armor =>
  a.state === 'dead' ? a : { state: 'armored', iFramesLeft: 0 }

/** Advance i-frames by `dt`. */
export const tick = (a: Armor, dt: number): Armor =>
  a.iFramesLeft <= 0 ? a : { ...a, iFramesLeft: Math.max(0, a.iFramesLeft - dt) }
