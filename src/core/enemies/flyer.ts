import { vec2 } from '@core/math/vector'
import type { Solid } from '@core/physics/body'
import type { Enemy, EnemyTarget } from './enemy'

/**
 * Flyer: a flying demon that chases the player in both axes (no gravity, ignores
 * solids) with a vertical sine bob for character. Pure and deterministic.
 */
export const FLYER = {
  speed: 70,
  hp: 1,
  w: 28,
  h: 20,
  bobAmplitude: 30,
  bobFrequency: 3,
} as const

export const createFlyer = (x: number, y: number): Enemy => ({
  kind: 'flyer',
  body: { pos: vec2(x, y), vel: vec2(0, 0), w: FLYER.w, h: FLYER.h, grounded: false },
  hp: FLYER.hp,
  state: 'flying',
  facing: -1,
  riseTimer: 0,
  age: 0,
})

export const stepFlyer = (
  e: Enemy,
  target: EnemyTarget,
  _solids: readonly Solid[],
  dt: number,
): Enemy => {
  if (e.state === 'dead') return e

  const cx = e.body.pos.x + e.body.w / 2
  const cy = e.body.pos.y + e.body.h / 2
  const dx = target.x - cx
  const dy = target.y - cy
  const len = Math.hypot(dx, dy) || 1

  const vx = (dx / len) * FLYER.speed
  const vy = (dy / len) * FLYER.speed + Math.cos(e.age * FLYER.bobFrequency) * FLYER.bobAmplitude
  const facing: 1 | -1 = dx < 0 ? -1 : 1

  const pos = vec2(e.body.pos.x + vx * dt, e.body.pos.y + vy * dt)
  const body = { ...e.body, pos, vel: vec2(vx, vy), grounded: false }
  return { ...e, body, state: 'flying', facing, age: e.age + dt }
}
