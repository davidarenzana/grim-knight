import type { AABB } from '@core/math/aabb'
import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Body } from '@core/physics/body'

/**
 * Player state machine (ground movement + jump + crouch).
 * Pure core: a deterministic function of (player, input, solids, dt).
 * Climb/throw/hurt/die states are added in later specs.
 */
export type PlayerState = 'idle' | 'run' | 'jump' | 'crouch'

export interface PlayerInput {
  readonly left: boolean
  readonly right: boolean
  readonly jump: boolean
  readonly down: boolean
}

export interface Player {
  readonly body: Body
  readonly state: PlayerState
  /** 1 = facing right, -1 = facing left. */
  readonly facing: 1 | -1
}

// Tunables (set during the greybox feel pass). Pixels and seconds.
export const GRAVITY = 1500
export const WALK_SPEED = 120
export const JUMP_IMPULSE = 400

export const PLAYER_W = 24
export const PLAYER_H = 48

export const createPlayer = (x: number, y: number): Player => ({
  body: createBody(x, y, PLAYER_W, PLAYER_H),
  state: 'idle',
  facing: 1,
})

export const stepPlayer = (
  player: Player,
  input: PlayerInput,
  solids: readonly AABB[],
  dt: number,
): Player => {
  const grounded = player.body.grounded
  const crouching = grounded && input.down

  // Horizontal: full control on the ground, none in the air (classic feel).
  let vx = player.body.vel.x
  if (grounded) {
    vx = crouching ? 0 : (input.right ? WALK_SPEED : 0) - (input.left ? WALK_SPEED : 0)
  }

  // Jump only from the ground and not while crouching (no double-jump).
  let vy = player.body.vel.y
  if (input.jump && grounded && !crouching) vy = -JUMP_IMPULSE

  const moved: Body = { ...player.body, vel: vec2(vx, vy) }
  const body = stepBody(moved, solids, GRAVITY, dt)

  let state: PlayerState
  if (!body.grounded) state = 'jump'
  else if (crouching) state = 'crouch'
  else if (body.vel.x !== 0) state = 'run'
  else state = 'idle'

  const facing: 1 | -1 = input.right ? 1 : input.left ? -1 : player.facing

  return { body, state, facing }
}
