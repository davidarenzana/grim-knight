import Phaser from 'phaser'
import { aabb, type AABB } from '@core/math/aabb'
import { lerp } from '@core/math/vector'
import { createStepper, type Stepper } from '@core/sim/loop'
import {
  createPlayer,
  stepPlayer,
  type Player,
  type PlayerInput,
  PLAYER_W,
  PLAYER_H,
} from '@core/fsm/player'
import { bus } from '@shared/events'

const FIXED_DT = 1 / 60

/**
 * Main game scene. It RENDERS the state produced by the pure `core/` simulation
 * (fixed-timestep stepper + interpolation) and translates keyboard input into a
 * `PlayerInput`. No game logic lives here — only presentation and IO.
 */
export class GameScene extends Phaser.Scene {
  private stepper!: Stepper
  private player!: Player
  private prev!: Player
  private solids: AABB[] = []
  private knight!: Phaser.GameObjects.Rectangle
  private keys!: {
    left: Phaser.Input.Keyboard.Key[]
    right: Phaser.Input.Keyboard.Key[]
    jump: Phaser.Input.Keyboard.Key[]
    down: Phaser.Input.Keyboard.Key[]
  }

  constructor() {
    super('GameScene')
  }

  create(): void {
    const { width } = this.scale

    // Greybox level geometry (the source of truth is `this.solids`).
    this.solids = [
      aabb(0, 410, width, 40), // ground
      aabb(300, 320, 160, 20), // floating platform
      aabb(620, 250, 30, 160), // wall
    ]
    for (const s of this.solids) {
      this.add.rectangle(s.x, s.y, s.w, s.h, 0x3a5a40).setOrigin(0, 0)
    }

    this.stepper = createStepper(FIXED_DT)
    this.player = createPlayer(80, 410 - PLAYER_H)
    this.prev = this.player

    this.knight = this.add
      .rectangle(this.player.body.pos.x, this.player.body.pos.y, PLAYER_W, PLAYER_H, 0xd9d9d9)
      .setOrigin(0, 0)

    this.add
      .text(width / 2, 24, 'GREYBOX — arrows/A-D move, Space jump, Down crouch', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    const kb = this.input.keyboard!
    const k = (code: number) => kb.addKey(code)
    const K = Phaser.Input.Keyboard.KeyCodes
    this.keys = {
      left: [k(K.LEFT), k(K.A)],
      right: [k(K.RIGHT), k(K.D)],
      jump: [k(K.SPACE), k(K.UP), k(K.Z)],
      down: [k(K.DOWN), k(K.S)],
    }

    bus.emit('game:ready')
    bus.emit('game:armor-changed', { armor: 'armored' })
    bus.emit('game:lives-changed', { lives: 3 })
    bus.emit('game:weapon-changed', { weapon: 'lance' })
  }

  private readInput(): PlayerInput {
    const down = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((key) => key.isDown)
    return {
      left: down(this.keys.left),
      right: down(this.keys.right),
      jump: down(this.keys.jump),
      down: down(this.keys.down),
    }
  }

  update(_time: number, delta: number): void {
    const input = this.readInput()
    const alpha = this.stepper.advance(delta / 1000, () => {
      this.prev = this.player
      this.player = stepPlayer(this.player, input, this.solids, FIXED_DT)
    })

    // Interpolate between the previous and current simulation state for smoothness.
    const pos = lerp(this.prev.body.pos, this.player.body.pos, alpha)
    this.knight.setPosition(pos.x, pos.y)
  }
}
