import Phaser from 'phaser'
import type { PlayerInput } from '@core/fsm/player'

/**
 * Keyboard adapter: maps physical keys onto the core `PlayerInput` port. The
 * scene reads intent through this module so it never deals with key codes
 * directly.
 *
 * Controls (NES-style): arrows move with the right hand; Z throws and X swaps
 * weapons with the left hand. Up jumps (or climbs on a ladder); Down crouches
 * (or climbs down). Up maps to both `up` and `jump` — the FSM climbs when on a
 * ladder and jumps otherwise. WASD and Space are kept as alternates.
 */
export interface Keymap {
  readonly left: Phaser.Input.Keyboard.Key[]
  readonly right: Phaser.Input.Keyboard.Key[]
  readonly up: Phaser.Input.Keyboard.Key[]
  readonly jump: Phaser.Input.Keyboard.Key[]
  readonly down: Phaser.Input.Keyboard.Key[]
  readonly attack: Phaser.Input.Keyboard.Key[]
  readonly swap: Phaser.Input.Keyboard.Key[]
}

export const createKeymap = (kb: Phaser.Input.Keyboard.KeyboardPlugin): Keymap => {
  const k = (code: number) => kb.addKey(code)
  const K = Phaser.Input.Keyboard.KeyCodes
  return {
    left: [k(K.LEFT), k(K.A)],
    right: [k(K.RIGHT), k(K.D)],
    up: [k(K.UP), k(K.W)],
    jump: [k(K.UP), k(K.W)],
    down: [k(K.DOWN), k(K.S)],
    attack: [k(K.Z), k(K.SPACE)],
    swap: [k(K.X)],
  }
}

const held = (keys: Phaser.Input.Keyboard.Key[]): boolean => keys.some((key) => key.isDown)

/** One frame of player intent, read from the held keys. */
export const readInput = (keys: Keymap): PlayerInput => ({
  left: held(keys.left),
  right: held(keys.right),
  up: held(keys.up),
  down: held(keys.down),
  jump: held(keys.jump),
  attack: held(keys.attack),
})

/** Edge-detected weapon swap (fires once per key press). */
export const swapJustPressed = (keys: Keymap): boolean =>
  keys.swap.some((key) => Phaser.Input.Keyboard.JustDown(key))
