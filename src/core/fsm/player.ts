import { aabb, intersects, type AABB } from '@core/math/aabb'
import { vec2 } from '@core/math/vector'
import { createBody, stepBody, type Body } from '@core/physics/body'
import { createArmor, hit, tick, type Armor } from '@core/rules/armor'

/**
 * Player state machine. Pure core: a deterministic function of
 * (player, input, world, dt). Covers ground movement, jump, crouch, ladder
 * climbing, throwing, and damage (hurt/die) by embedding the player's Armor.
 */
export type PlayerState = 'idle' | 'run' | 'jump' | 'crouch' | 'climb' | 'throw' | 'hurt' | 'die'

export interface PlayerInput {
  readonly left: boolean
  readonly right: boolean
  readonly up: boolean
  readonly down: boolean
  readonly jump: boolean
  readonly attack: boolean
}

export interface PlayerWorld {
  readonly solids: readonly AABB[]
  /** Climbable regions (ladders). */
  readonly ladders?: readonly AABB[]
  /** True when a hit lands on the player this step. */
  readonly damaged?: boolean
}

export interface Player {
  readonly body: Body
  readonly state: PlayerState
  /** 1 = facing right, -1 = facing left. */
  readonly facing: 1 | -1
  readonly armor: Armor
  /** Remaining hurt-state time in seconds. */
  readonly hurtTimer: number
  /** Remaining throw-animation time in seconds. */
  readonly throwTimer: number
}

// Tunables (set during the greybox feel pass). Pixels and seconds.
export const GRAVITY = 1500
export const WALK_SPEED = 120
export const JUMP_IMPULSE = 400
export const CLIMB_SPEED = 90
export const HURT_SECONDS = 0.4
export const THROW_SECONDS = 0.25
export const KNOCKBACK_X = 140
export const KNOCKBACK_Y = -180

export const PLAYER_W = 24
export const PLAYER_H = 48

export const NO_INPUT: PlayerInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false,
}

export const createPlayer = (x: number, y: number): Player => ({
  body: createBody(x, y, PLAYER_W, PLAYER_H),
  state: 'idle',
  facing: 1,
  armor: createArmor(),
  hurtTimer: 0,
  throwTimer: 0,
})

export const stepPlayer = (
  player: Player,
  input: PlayerInput,
  world: PlayerWorld,
  dt: number,
): Player => {
  const solids = world.solids
  const ladders = world.ladders ?? []

  // Advance timers.
  let armor = tick(player.armor, dt)
  let hurtTimer = Math.max(0, player.hurtTimer - dt)
  let throwTimer = Math.max(0, player.throwTimer - dt)

  // Already dead: collapse to `die`, keep falling under gravity.
  if (armor.state === 'dead') {
    const body = stepBody({ ...player.body, vel: vec2(0, player.body.vel.y) }, solids, GRAVITY, dt)
    return { ...player, body, state: 'die', armor, hurtTimer: 0, throwTimer: 0 }
  }

  // Resolve a hit landing this step.
  let knocked = false
  if (world.damaged) {
    const afterHit = hit(armor)
    const landed = afterHit !== armor // `hit` returns the same ref when ignored
    armor = afterHit
    if (landed) {
      hurtTimer = HURT_SECONDS
      knocked = true
      if (armor.state === 'dead') {
        const body = stepBody(
          { ...player.body, vel: vec2(-player.facing * KNOCKBACK_X, KNOCKBACK_Y) },
          solids,
          GRAVITY,
          dt,
        )
        return { ...player, body, state: 'die', armor, hurtTimer: 0, throwTimer: 0 }
      }
    }
  }

  const hurting = hurtTimer > 0
  const grounded = player.body.grounded
  const playerBox = aabb(player.body.pos.x, player.body.pos.y, player.body.w, player.body.h)
  const onLadder = ladders.some((l) => intersects(playerBox, l))
  const wasClimbing = player.state === 'climb'

  // Climbing: attached while overlapping a ladder and either pressing up/down or
  // already climbing. Jumping detaches.
  const wantsClimb = onLadder && !hurting && (input.up || input.down || wasClimbing)
  const climbing = wantsClimb && !input.jump

  const crouching = grounded && input.down && !climbing && !hurting

  let vx = player.body.vel.x
  let vy = player.body.vel.y
  let gravity = GRAVITY

  if (hurting) {
    // No control while hurt; apply knockback once on the landing step.
    if (knocked) {
      vx = -player.facing * KNOCKBACK_X
      vy = KNOCKBACK_Y
    }
  } else if (climbing) {
    gravity = 0
    vx = 0
    vy = input.up ? -CLIMB_SPEED : input.down ? CLIMB_SPEED : 0
  } else {
    if (grounded) {
      vx = crouching ? 0 : (input.right ? WALK_SPEED : 0) - (input.left ? WALK_SPEED : 0)
    }
    const jumpFromGround = input.jump && grounded && !crouching
    const jumpOffLadder = input.jump && wantsClimb
    if (jumpFromGround || jumpOffLadder) vy = -JUMP_IMPULSE
  }

  // Throw window (visual): triggered by attack when able to act.
  if (input.attack && !hurting && throwTimer <= 0) throwTimer = THROW_SECONDS

  const moved: Body = { ...player.body, vel: vec2(vx, vy) }
  const body = stepBody(moved, solids, gravity, dt)

  let state: PlayerState
  if (hurting) state = 'hurt'
  else if (climbing) state = 'climb'
  else if (!body.grounded) state = 'jump'
  else if (throwTimer > 0) state = 'throw'
  else if (crouching) state = 'crouch'
  else if (body.vel.x !== 0) state = 'run'
  else state = 'idle'

  const facing: 1 | -1 = hurting ? player.facing : input.right ? 1 : input.left ? -1 : player.facing

  return { body, state, facing, armor, hurtTimer, throwTimer }
}
