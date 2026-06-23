import { vec2, type Vec2 } from '@core/math/vector'
import type { Solid } from './body'

/**
 * A kinematic moving platform: a box that travels back and forth along a single
 * straight segment (`from` ↔ `to`) at a constant speed, reversing at each end.
 * It is a one-way (semi-solid) collider — the knight jumps up through it and
 * lands on top — and while ridden it carries him by its per-step delta (the
 * carry itself lives in `core/app/match`, which has the player). Pure and
 * deterministic: position is a function of the previous state and `dt` only.
 */
export interface Platform {
  /** Current top-left position. */
  readonly pos: Vec2
  readonly w: number
  readonly h: number
  /** Path endpoints; the platform oscillates between them. */
  readonly from: Vec2
  readonly to: Vec2
  /** Travel speed in px/s along the segment. */
  readonly speed: number
  /** Current heading: 1 → toward `to`, -1 → toward `from`. */
  readonly dir: 1 | -1
}

/** Build a platform starting at `(x, y)`, travelling first toward `to`. */
export const createPlatform = (
  x: number,
  y: number,
  w: number,
  h: number,
  to: { readonly x: number; readonly y: number },
  speed: number,
): Platform => ({
  pos: vec2(x, y),
  w,
  h,
  from: vec2(x, y),
  to: vec2(to.x, to.y),
  speed,
  dir: 1,
})

/** The one-way collider the knight stands on, at the platform's current position. */
export const platformSolid = (p: Platform): Solid => ({
  x: p.pos.x,
  y: p.pos.y,
  w: p.w,
  h: p.h,
  oneWay: true,
})

/**
 * Advance a platform by one fixed `dt`. It moves `speed * dt` toward its current
 * target endpoint; if that would reach or pass the endpoint it snaps exactly
 * onto it and reverses, so it never overshoots (no jitter at the ends).
 */
export const stepPlatform = (p: Platform, dt: number): Platform => {
  const target = p.dir > 0 ? p.to : p.from
  const dx = target.x - p.pos.x
  const dy = target.y - p.pos.y
  const dist = Math.hypot(dx, dy)
  const move = p.speed * dt
  if (dist === 0 || move >= dist) {
    return { ...p, pos: vec2(target.x, target.y), dir: -p.dir as 1 | -1 }
  }
  return { ...p, pos: vec2(p.pos.x + (dx / dist) * move, p.pos.y + (dy / dist) * move) }
}
