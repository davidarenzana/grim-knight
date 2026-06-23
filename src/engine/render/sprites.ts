import type Phaser from 'phaser'
import { animKey, hasAnim, SPRITES } from '@engine/assets/sprites'

/** A core body box: enough to place a sprite from the simulation state. */
export interface BodyBox {
  readonly pos: { readonly x: number; readonly y: number }
  readonly w: number
  readonly h: number
}

/** Map a core enemy state to a sprite animation state (idle/walk/dead). */
export const enemyAnim = (state: string): string =>
  state === 'dead' ? 'dead' : state === 'walking' ? 'walk' : 'idle'

/** Map the player FSM state to a knight animation state. */
export const knightAnim = (state: string): string => {
  switch (state) {
    case 'run':
      return 'run'
    case 'jump':
      return 'jump'
    case 'throw':
      return 'attack'
    case 'hurt':
      return 'hurt'
    case 'die':
      return 'dead'
    default:
      return 'idle' // idle, crouch, climb
  }
}

/**
 * Play `<entity>-<state>` on a sprite and place it from the core body box:
 * foot-aligned for walkers (origin bottom + scaled foot padding), centered for
 * flyers. Falls back to idle/first state when the requested anim is missing.
 */
export const applySprite = (
  sprite: Phaser.GameObjects.Sprite,
  entity: string,
  state: string,
  body: BodyBox,
  facing: 1 | -1,
): void => {
  const def = SPRITES[entity]!
  const animState = hasAnim(entity, state)
    ? state
    : hasAnim(entity, 'idle')
      ? 'idle'
      : Object.keys(def.states)[0]!
  sprite.play(animKey(entity, animState), true)
  // The hero/enemy sheets face right by default (flip when facing left); the boss
  // packs face left, so their flip is inverted (`faceLeft`).
  const mirrored = def.faceLeft ? facing > 0 : facing < 0
  sprite.setScale(def.scale).setFlipX(mirrored)
  const cx = body.pos.x + body.w / 2
  if (def.center) {
    sprite.setOrigin(0.5, 0.5).setPosition(cx, body.pos.y + body.h / 2)
  } else {
    sprite.setOrigin(0.5, 1).setPosition(cx, body.pos.y + body.h + def.foot * def.scale)
  }
}
