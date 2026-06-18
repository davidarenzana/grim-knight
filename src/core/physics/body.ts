import { aabb, intersects, type AABB } from '@core/math/aabb'
import { vec2, type Vec2 } from '@core/math/vector'

/**
 * A dynamic physics body: an axis-aligned box with position and velocity.
 * Pure core: integration and collision resolution are deterministic functions
 * of their inputs (no wall-clock time, no globals).
 */
export interface Body {
  readonly pos: Vec2
  readonly vel: Vec2
  readonly w: number
  readonly h: number
  /** True when the body is resting on a solid (set by `stepBody`). */
  readonly grounded: boolean
}

/**
 * A static collider. A `oneWay` solid (a "semi-solid" platform) never blocks
 * horizontal movement and only stops a body that is falling onto it from above,
 * so bodies can jump or climb up through it and land on top.
 */
export type Solid = AABB & { readonly oneWay?: boolean }

export const createBody = (x: number, y: number, w: number, h: number): Body => ({
  pos: vec2(x, y),
  vel: vec2(0, 0),
  w,
  h,
  grounded: false,
})

/**
 * Advance a body by one fixed `dt`, applying gravity and resolving collisions
 * against static solids. Axes are resolved independently (X then Y), which is
 * the standard, robust approach for tile-based platformers.
 */
export const stepBody = (
  body: Body,
  solids: readonly Solid[],
  gravity: number,
  dt: number,
): Body => {
  let { x, y } = body.pos
  let vx = body.vel.x
  let vy = body.vel.y + gravity * dt

  // --- Horizontal move + resolve ---
  // Only resolve along an axis we actually moved on; otherwise a pre-existing
  // overlap on the other axis would wrongly push the body sideways. One-way
  // platforms never block horizontal movement.
  x += vx * dt
  if (vx !== 0) {
    for (const s of solids) {
      if (s.oneWay) continue
      if (!intersects(aabb(x, y, body.w, body.h), s)) continue
      x = vx > 0 ? s.x - body.w : s.x + s.w
      vx = 0
    }
  }

  // --- Vertical move + resolve ---
  // `startBottom` is the body's bottom edge before this vertical move, used to
  // tell whether a one-way platform is being landed on from above.
  const startBottom = y + body.h
  let grounded = false
  y += vy * dt
  if (vy !== 0) {
    for (const s of solids) {
      if (!intersects(aabb(x, y, body.w, body.h), s)) continue
      if (s.oneWay) {
        // Land only when falling onto it from above; otherwise pass through.
        if (vy > 0 && startBottom <= s.y + 0.001) {
          y = s.y - body.h
          vy = 0
          grounded = true
        }
      } else if (vy > 0) {
        // Falling: land on top of the solid.
        y = s.y - body.h
        vy = 0
        grounded = true
      } else {
        // Rising: bonk head on the bottom of the solid.
        y = s.y + s.h
        vy = 0
      }
    }
  }

  return { pos: vec2(x, y), vel: vec2(vx, vy), w: body.w, h: body.h, grounded }
}
