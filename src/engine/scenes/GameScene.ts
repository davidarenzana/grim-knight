import Phaser from 'phaser'
import { bus } from '@shared/events'

/**
 * Main game scene. In this phase (greybox / hello-world) it only draws a
 * background and a rectangle standing in for the knight, and emits `game:ready`.
 *
 * As the project advances, this scene will only RENDER the state produced by the
 * `core/` simulation (fixed timestep + interpolation) and translate input into
 * commands. The logic lives in `core/`, not here.
 */
export class GameScene extends Phaser.Scene {
  private knight!: Phaser.GameObjects.Rectangle

  constructor() {
    super('GameScene')
  }

  create(): void {
    const { width, height } = this.scale

    // Greybox ground.
    this.add.rectangle(width / 2, height - 24, width, 48, 0x3a5a40)
    // Greybox knight.
    this.knight = this.add.rectangle(120, height - 72, 24, 48, 0xd9d9d9)

    this.add
      .text(width / 2, 40, 'GREYBOX — knight (placeholder)', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    bus.emit('game:ready')
    bus.emit('game:armor-changed', { armor: 'armored' })
    bus.emit('game:lives-changed', { lives: 3 })
    bus.emit('game:weapon-changed', { weapon: 'lance' })
  }

  update(_time: number, delta: number): void {
    // Demo movement: back-and-forth. Will be replaced by the core render.
    this.knight.x += (delta / 1000) * 60
    if (this.knight.x > this.scale.width - 60) this.knight.x = 60
  }
}
