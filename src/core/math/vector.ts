/**
 * Immutable 2D vector and its associated pure functions.
 * Belongs to the core (`core/`): no Phaser/Vue/DOM dependencies.
 */
export interface Vec2 {
  readonly x: number
  readonly y: number
}

export const vec2 = (x: number, y: number): Vec2 => ({ x, y })

export const ZERO: Vec2 = vec2(0, 0)

export const add = (a: Vec2, b: Vec2): Vec2 => vec2(a.x + b.x, a.y + b.y)

export const sub = (a: Vec2, b: Vec2): Vec2 => vec2(a.x - b.x, a.y - b.y)

export const scale = (v: Vec2, s: number): Vec2 => vec2(v.x * s, v.y * s)

export const length = (v: Vec2): number => Math.hypot(v.x, v.y)

export const normalize = (v: Vec2): Vec2 => {
  const len = length(v)
  return len === 0 ? ZERO : scale(v, 1 / len)
}

/** Linear interpolation, used to interpolate the render between two simulation steps. */
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 =>
  vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
