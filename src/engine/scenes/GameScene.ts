import Phaser from 'phaser'
import { aabb, type AABB } from '@core/math/aabb'
import type { Solid } from '@core/physics/body'
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
import {
  createZombie,
  createFlyer,
  createOgre,
  stepEnemy,
  type Enemy,
  type EnemyKind,
} from '@core/enemies'
import { createSpawner, isFinished, stepSpawner, type Spawner } from '@core/level/spawner'
import { resolveCombat } from '@core/rules/combat'
import { addScore, createSession, loseLife, win, type Session } from '@core/rules/session'
import type { ArmorState } from '@core/rules/armor'
import { bus } from '@shared/events'

const FIXED_DT = 1 / 60
const GROUND_Y = 410
const START_X = 80
const START_Y = GROUND_Y - PLAYER_H
const SCORE_PER_KILL = 100

const ENEMY_COLOR: Record<EnemyKind, number> = {
  zombie: 0x6b8e23,
  flyer: 0x9b59b6,
  ogre: 0x8b1a1a,
}

/**
 * Main game scene. It RENDERS the state produced by the pure `core/` simulation
 * (fixed-timestep stepper + interpolation), translates keyboard input, runs the
 * combat/session rules from `core/`, and emits `game:*` events to the Vue HUD.
 * No game logic lives here — only presentation, IO and orchestration.
 */
export class GameScene extends Phaser.Scene {
  private stepper!: Stepper
  private player!: Player
  private prev!: Player
  private weapon!: WeaponState
  private enemies: Enemy[] = []
  private spawner!: Spawner
  private session!: Session
  private over = false
  private lastArmor: ArmorState = 'armored'

  private solids: Solid[] = []
  private ladders: AABB[] = []
  private bounds!: { minX: number; maxX: number }

  private knight!: Phaser.GameObjects.Rectangle
  private projRects: Phaser.GameObjects.Rectangle[] = []
  private enemyRects: Phaser.GameObjects.Rectangle[] = []
  private keys!: {
    left: Phaser.Input.Keyboard.Key[]
    right: Phaser.Input.Keyboard.Key[]
    up: Phaser.Input.Keyboard.Key[]
    jump: Phaser.Input.Keyboard.Key[]
    down: Phaser.Input.Keyboard.Key[]
    attack: Phaser.Input.Keyboard.Key[]
  }

  private onPause = () => this.scene.pause()
  private onResume = () => this.scene.resume()

  constructor() {
    super('GameScene')
  }

  create(): void {
    const { width } = this.scale

    const height = this.scale.height
    this.solids = [
      aabb(0, GROUND_Y, width, 40), // ground (solid)
      { ...aabb(300, 320, 160, 20), oneWay: true }, // floating platform (jump/climb up through it)
      aabb(620, 250, 30, 160), // wall (solid)
      aabb(-40, -200, 40, height + 400), // left world boundary (keeps the player on screen)
      aabb(width, -200, 40, height + 400), // right world boundary
    ]
    for (const s of this.solids) {
      // Skip the off-screen boundary walls; draw the rest (one-way lighter).
      if (s.x + s.w <= 0 || s.x >= width) continue
      this.add.rectangle(s.x, s.y, s.w, s.h, s.oneWay ? 0x6b8f5a : 0x3a5a40).setOrigin(0, 0)
    }

    this.ladders = [aabb(360, 320, 16, 90)]
    for (const l of this.ladders) {
      this.add.rectangle(l.x, l.y, l.w, l.h, 0x8a6d3b).setOrigin(0, 0)
    }

    this.bounds = { minX: 0, maxX: width }
    this.stepper = createStepper(FIXED_DT)
    this.player = createPlayer(START_X, START_Y)
    this.prev = this.player
    this.weapon = createWeapon()
    this.session = createSession()
    this.over = false
    this.lastArmor = 'armored'
    this.enemies = []
    // A finite, winnable greybox wave: clear them all to win.
    this.spawner = createSpawner([
      { at: 0.5, kind: 'zombie', x: 260, y: GROUND_Y },
      { at: 1.5, kind: 'flyer', x: 760, y: 120 },
      { at: 3.0, kind: 'zombie', x: 720, y: GROUND_Y },
      { at: 4.5, kind: 'ogre', x: 760, y: GROUND_Y },
      { at: 6.0, kind: 'flyer', x: 40, y: 100 },
    ])

    this.knight = this.add
      .rectangle(this.player.body.pos.x, this.player.body.pos.y, PLAYER_W, PLAYER_H, 0xd9d9d9)
      .setOrigin(0, 0)

    this.add
      .text(
        this.scale.width / 2,
        24,
        'GREYBOX — ←/→ move, ↑ jump/climb, ↓ crouch/down, Space throw',
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ffffff',
        },
      )
      .setOrigin(0.5)

    const kb = this.input.keyboard!
    const k = (code: number) => kb.addKey(code)
    const K = Phaser.Input.Keyboard.KeyCodes
    // Controls: arrows move; Up jumps (or climbs on a ladder); Down crouches
    // (or climbs down); Space throws. Up is mapped to both `up` and `jump` — the
    // FSM climbs when on a ladder and jumps otherwise.
    this.keys = {
      left: [k(K.LEFT), k(K.A)],
      right: [k(K.RIGHT), k(K.D)],
      up: [k(K.UP), k(K.W)],
      jump: [k(K.UP), k(K.W)],
      down: [k(K.DOWN), k(K.S)],
      attack: [k(K.SPACE)],
    }

    // Pause/resume driven by the UI; cleaned up when the scene shuts down.
    bus.on('ui:pause', this.onPause)
    bus.on('ui:resume', this.onResume)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off('ui:pause', this.onPause)
      bus.off('ui:resume', this.onResume)
    })

    bus.emit('game:ready')
    bus.emit('game:armor-changed', { armor: 'armored' })
    bus.emit('game:lives-changed', { lives: this.session.lives })
    bus.emit('game:score-changed', { score: this.session.score })
    bus.emit('game:weapon-changed', { weapon: LANCE.id })
  }

  private held(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((key) => key.isDown)
  }

  private readInput(): PlayerInput {
    return {
      left: this.held(this.keys.left),
      right: this.held(this.keys.right),
      up: this.held(this.keys.up),
      down: this.held(this.keys.down),
      jump: this.held(this.keys.jump),
      attack: this.held(this.keys.attack),
    }
  }

  update(_time: number, delta: number): void {
    if (this.over) return
    const input = this.readInput()
    const alpha = this.stepper.advance(delta / 1000, () => this.tick(input))

    const pos = lerp(this.prev.body.pos, this.player.body.pos, alpha)
    this.knight.setPosition(pos.x, pos.y)
    this.renderProjectiles()
    this.renderEnemies()
  }

  /** One fixed simulation step: enemies, weapon, combat, player, session. */
  private tick(input: PlayerInput): void {
    if (this.over) return
    this.prev = this.player

    // Spawn due enemies, then steer every enemy toward the player.
    const spawn = stepSpawner(this.spawner, FIXED_DT)
    this.spawner = spawn.spawner
    for (const ev of spawn.due) this.enemies.push(this.spawnEnemy(ev.kind, ev.x, ev.y))

    const b0 = this.player.body
    const target = { x: b0.pos.x + b0.w / 2, y: b0.pos.y + b0.h / 2 }
    this.enemies = this.enemies.map((e) => stepEnemy(e, target, this.solids, FIXED_DT))

    if (input.attack) {
      const b = this.player.body
      const originX = this.player.facing > 0 ? b.pos.x + b.w : b.pos.x - LANCE.w
      const originY = b.pos.y + b.h / 2
      this.weapon = fire(this.weapon, LANCE, originX, originY, this.player.facing)
    }
    this.weapon = stepWeapon(this.weapon, FIXED_DT, this.bounds)

    const b = this.player.body
    const playerBox = aabb(b.pos.x, b.pos.y, b.w, b.h)
    const result = resolveCombat(playerBox, this.weapon.projectiles, this.enemies)
    this.weapon = { ...this.weapon, projectiles: result.projectiles }
    this.enemies = result.enemies as Enemy[]

    if (result.kills > 0) {
      this.session = addScore(this.session, result.kills * SCORE_PER_KILL)
      bus.emit('game:score-changed', { score: this.session.score })
    }

    this.player = stepPlayer(
      this.player,
      input,
      { solids: this.solids, ladders: this.ladders, damaged: result.playerHit },
      FIXED_DT,
    )

    if (this.player.armor.state !== this.lastArmor) {
      this.lastArmor = this.player.armor.state
      bus.emit('game:armor-changed', { armor: this.lastArmor })
    }

    if (this.player.armor.state === 'dead') {
      this.onPlayerDead()
      return
    }

    if (
      isFinished(this.spawner) &&
      this.enemies.length > 0 &&
      this.enemies.every((e) => e.state === 'dead')
    ) {
      this.onWin()
    }
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number): Enemy {
    switch (kind) {
      case 'zombie':
        return createZombie(x, y)
      case 'ogre':
        return createOgre(x, y)
      case 'flyer':
        return createFlyer(x, y)
    }
  }

  private onPlayerDead(): void {
    this.session = loseLife(this.session)
    bus.emit('game:lives-changed', { lives: this.session.lives })
    if (this.session.state === 'gameover') {
      this.over = true
      bus.emit('game:over', { score: this.session.score })
    } else {
      this.player = createPlayer(START_X, START_Y)
      this.prev = this.player
      this.lastArmor = 'armored'
      bus.emit('game:armor-changed', { armor: 'armored' })
    }
  }

  private onWin(): void {
    this.over = true
    this.session = win(this.session)
    bus.emit('game:won', { score: this.session.score })
  }

  /** Sync the projectile rectangle pool to the current weapon state. */
  private renderProjectiles(): void {
    const projectiles = this.weapon.projectiles
    while (this.projRects.length < projectiles.length) {
      this.projRects.push(this.add.rectangle(0, 0, LANCE.w, LANCE.h, 0xffcc00).setOrigin(0, 0))
    }
    this.projRects.forEach((rect, i) => {
      const p = projectiles[i]
      if (p) rect.setVisible(true).setPosition(p.pos.x, p.pos.y).setSize(p.w, p.h)
      else rect.setVisible(false)
    })
  }

  /** Sync the enemy rectangle pool; dead enemies are hidden, colored per kind. */
  private renderEnemies(): void {
    while (this.enemyRects.length < this.enemies.length) {
      this.enemyRects.push(this.add.rectangle(0, 0, 1, 1, 0xffffff).setOrigin(0, 0))
    }
    this.enemyRects.forEach((rect, i) => {
      const e = this.enemies[i]
      if (e && e.state !== 'dead') {
        rect
          .setVisible(true)
          .setFillStyle(ENEMY_COLOR[e.kind])
          .setPosition(e.body.pos.x, e.body.pos.y)
          .setSize(e.body.w, e.body.h)
      } else {
        rect.setVisible(false)
      }
    })
  }
}
