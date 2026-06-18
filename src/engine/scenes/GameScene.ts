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
import { createWeapon, fire, stepWeapon, LANCE, type WeaponState } from '@core/weapons/weapon'
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
  private weapon!: WeaponState
  private solids: AABB[] = []
  private bounds!: { minX: number; maxX: number }
  private knight!: Phaser.GameObjects.Rectangle
  private projRects: Phaser.GameObjects.Rectangle[] = []
  private keys!: {
    left: Phaser.Input.Keyboard.Key[]
    right: Phaser.Input.Keyboard.Key[]
    jump: Phaser.Input.Keyboard.Key[]
    down: Phaser.Input.Keyboard.Key[]
    attack: Phaser.Input.Keyboard.Key[]
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

    this.bounds = { minX: 0, maxX: width }
    this.stepper = createStepper(FIXED_DT)
    this.player = createPlayer(80, 410 - PLAYER_H)
    this.prev = this.player
    this.weapon = createWeapon()

    this.knight = this.add
      .rectangle(this.player.body.pos.x, this.player.body.pos.y, PLAYER_W, PLAYER_H, 0xd9d9d9)
      .setOrigin(0, 0)

    this.add
      .text(width / 2, 24, 'GREYBOX — arrows/A-D move, Space jump, Down crouch, X throw', {
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
      attack: [k(K.X)],
    }

    bus.emit('game:ready')
    bus.emit('game:armor-changed', { armor: 'armored' })
    bus.emit('game:lives-changed', { lives: 3 })
    bus.emit('game:weapon-changed', { weapon: 'lance' })
  }

  private held(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((key) => key.isDown)
  }

  private readInput(): PlayerInput {
    return {
      left: this.held(this.keys.left),
      right: this.held(this.keys.right),
      jump: this.held(this.keys.jump),
      down: this.held(this.keys.down),
    }
  }

  update(_time: number, delta: number): void {
    const input = this.readInput()
    const attacking = this.held(this.keys.attack)

    const alpha = this.stepper.advance(delta / 1000, () => {
      this.prev = this.player
      this.player = stepPlayer(this.player, input, this.solids, FIXED_DT)

      if (attacking) {
        const b = this.player.body
        const originX = this.player.facing > 0 ? b.pos.x + b.w : b.pos.x - LANCE.w
        const originY = b.pos.y + b.h / 2
        this.weapon = fire(this.weapon, LANCE, originX, originY, this.player.facing)
      }
      this.weapon = stepWeapon(this.weapon, FIXED_DT, this.bounds)
    })

    // Interpolate between the previous and current simulation state for smoothness.
    const pos = lerp(this.prev.body.pos, this.player.body.pos, alpha)
    this.knight.setPosition(pos.x, pos.y)
    this.renderProjectiles()
  }

  /** Sync the projectile rectangle pool to the current weapon state. */
  private renderProjectiles(): void {
    const projectiles = this.weapon.projectiles
    while (this.projRects.length < projectiles.length) {
      this.projRects.push(this.add.rectangle(0, 0, LANCE.w, LANCE.h, 0xffcc00).setOrigin(0, 0))
    }
    this.projRects.forEach((rect, i) => {
      const p = projectiles[i]
      if (p) {
        rect.setVisible(true).setPosition(p.pos.x, p.pos.y).setSize(p.w, p.h)
      } else {
        rect.setVisible(false)
      }
    })
  }
}
