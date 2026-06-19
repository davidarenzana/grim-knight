import { describe, expect, it } from 'vitest'
import { LEVELS } from './level'
import { weaponById } from '@core/weapons/weapon'

const SCREEN_W = 800

describe('levels', () => {
  it('has the six stages with unique names', () => {
    expect(LEVELS).toHaveLength(6)
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(6)
  })

  it('each level is wider than the screen (so the camera scrolls)', () => {
    for (const lvl of LEVELS) expect(lvl.worldWidth).toBeGreaterThanOrEqual(SCREEN_W)
  })

  it('every spawn sits within the world bounds', () => {
    for (const lvl of LEVELS) {
      for (const s of lvl.spawns) {
        expect(s.x).toBeGreaterThanOrEqual(0)
        expect(s.x).toBeLessThanOrEqual(lvl.worldWidth)
      }
    }
  })

  it('each level ends with a boss (so it is clearable to advance)', () => {
    for (const lvl of LEVELS) {
      expect(lvl.spawns.some((s) => s.kind === 'boss')).toBe(true)
    }
  })

  it('the player starts inside the world', () => {
    for (const lvl of LEVELS) {
      expect(lvl.playerStart.x).toBeGreaterThanOrEqual(0)
      expect(lvl.playerStart.x).toBeLessThan(lvl.worldWidth)
    }
  })

  it('chests sit within bounds and reference valid weapons', () => {
    for (const lvl of LEVELS) {
      for (const c of lvl.chests ?? []) {
        expect(c.x).toBeGreaterThanOrEqual(0)
        expect(c.x).toBeLessThanOrEqual(lvl.worldWidth)
        if (c.reward.kind === 'weapon') expect(weaponById(c.reward.weaponId)).toBeDefined()
      }
    }
  })

  // --- Pit/geometry invariants (so the GnG-style redesign stays passable) ---
  const GROUND_Y = 410
  const MAX_GAP = 90 // a jump clears ~90px; pits must be no wider

  /** Ground solids: non-oneWay segments sitting at the ground line. */
  const groundOf = (lvl: (typeof LEVELS)[number]) =>
    lvl.solids.filter((s) => !s.oneWay && s.y === GROUND_Y).sort((a, b) => a.x - b.x)

  /** Is the whole span [x, x+w] covered by ground (no pit underneath)? */
  const supported = (lvl: (typeof LEVELS)[number], x: number, w: number): boolean => {
    const ground = groundOf(lvl)
    for (let px = x; px <= x + w; px += 4) {
      if (!ground.some((s) => px >= s.x && px <= s.x + s.w)) return false
    }
    return true
  }

  it('the player always starts on solid ground', () => {
    for (const lvl of LEVELS) expect(supported(lvl, lvl.playerStart.x, 24)).toBe(true)
  })

  it('no ground-bound enemy (or the boss) spawns over a pit', () => {
    for (const lvl of LEVELS) {
      for (const s of lvl.spawns) {
        if (s.kind === 'flyer') continue // flyers spawn in the air
        const w = s.kind === 'boss' ? 64 : 44
        expect({
          level: lvl.name,
          kind: s.kind,
          x: s.x,
          supported: supported(lvl, s.x, w),
        }).toEqual({ level: lvl.name, kind: s.kind, x: s.x, supported: true })
      }
    }
  })

  it('every chest sits on solid ground', () => {
    for (const lvl of LEVELS) {
      for (const c of lvl.chests ?? []) {
        expect({ level: lvl.name, x: c.x, ok: supported(lvl, c.x, c.w) }).toEqual({
          level: lvl.name,
          x: c.x,
          ok: true,
        })
      }
    }
  })

  it('pits are jumpable (gaps between ground segments ≤ MAX_GAP)', () => {
    for (const lvl of LEVELS) {
      const ground = groundOf(lvl)
      for (let i = 1; i < ground.length; i++) {
        const gap = ground[i]!.x - (ground[i - 1]!.x + ground[i - 1]!.w)
        expect({ level: lvl.name, gap: Math.max(0, gap), ok: gap <= MAX_GAP }).toEqual({
          level: lvl.name,
          gap: Math.max(0, gap),
          ok: true,
        })
      }
    }
  })
})
