/**
 * Axis-Aligned Bounding Box collision primitive.
 * Origin at the top-left corner; the Y axis grows downwards (screen convention).
 * Pure core: no external dependencies.
 */
export interface AABB {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export const aabb = (x: number, y: number, w: number, h: number): AABB => ({ x, y, w, h })

export const right = (b: AABB): number => b.x + b.w
export const bottom = (b: AABB): number => b.y + b.h

/** Do two boxes overlap? Exact edge contact does NOT count as overlap. */
export const intersects = (a: AABB, b: AABB): boolean =>
  a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y

/** Is the point inside the box? */
export const containsPoint = (b: AABB, px: number, py: number): boolean =>
  px >= b.x && px <= right(b) && py >= b.y && py <= bottom(b)

/** Penetration depth on each axis (0 if there is no overlap). Useful to resolve collisions. */
export const overlap = (a: AABB, b: AABB): { x: number; y: number } => {
  if (!intersects(a, b)) return { x: 0, y: 0 }
  const ox = Math.min(right(a), right(b)) - Math.max(a.x, b.x)
  const oy = Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y)
  return { x: ox, y: oy }
}
