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
import {
  createWeapon,
  fire,
  stepWeapon,
  advanceProjectiles,
  nextWeapon,
  weaponById,
  LANCE,
  type WeaponDef,
  type WeaponState,
  type Projectile,
} from '@core/weapons/weapon'
import {
  createZombie,
  createFlyer,
  createOgre,
  createPlant,
  createBoss,
  BOSS,
  stepEnemy,
  type Enemy,
  type EnemyKind,
} from '@core/enemies'
import { createSpawner, isFinished, stepSpawner, type Spawner } from '@core/level/spawner'
import { createTimer, tickTimer, type StageTimer } from '@core/level/timer'
import { LEVELS } from '@core/level/level'
import { openChests, type Chest, type ChestReward } from '@core/level/chest'
import { resolveCombat, resolveEnemyProjectiles } from '@core/rules/combat'
import { addScore, createSession, gainLife, loseLife, win, type Session } from '@core/rules/session'
import { pickupArmor, type ArmorState } from '@core/rules/armor'
import { preloadSprites, createAnims, animKey, hasAnim, SPRITES } from '@engine/assets/sprites'
import { preloadTiles, backgroundFor, TILE } from '@engine/assets/tiles'
import { bus } from '@shared/events'

/** Map a core enemy state to a sprite animation state (idle/walk/dead). */
const enemyAnim = (state: string): string =>
  state === 'dead' ? 'dead' : state === 'walking' ? 'walk' : 'idle'

const FIXED_DT = 1 / 60
const SCORE_PER_KILL = 100
const CROUCH_H = Math.round(PLAYER_H * 0.6) // shorter profile while crouching (dodge high shots)
const HIT_FLASH = 0.1 // seconds an enemy flashes white after taking a hit
const STAGE_CLEAR_MS = 1700 // banner hold before advancing to the next stage

/** Format a 0xRRGGBB number as a CSS hex string for Phaser text colors. */
const hexColor = (n: number): string => `#${n.toString(16).padStart(6, '0')}`

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
  private activeWeapon: WeaponDef = LANCE
  private enemies: Enemy[] = []
  private enemyFlash: number[] = [] // per-enemy hit-flash timer (juice)
  private enemyProjectiles: Projectile[] = []
  private chests: Chest[] = []
  private spawner!: Spawner
  private timer!: StageTimer
  private session!: Session
  private over = false
  private lastArmor: ArmorState = 'armored'
  private lastSecond = -1
  private lastBossHp = -1
  private bossCleared = false

  private solids: Solid[] = []
  private ladders: AABB[] = []
  private bounds!: { minX: number; maxX: number }

  // Level state (carried across stage transitions via scene.restart).
  private levelIndex = 0
  private loop = 1
  private carriedSession: Session | null = null
  private start = { x: 80, y: 362 }
  private stageSeconds = 99

  private knight!: Phaser.GameObjects.Sprite
  private projRects: Phaser.GameObjects.Rectangle[] = []
  private enemyProjRects: Phaser.GameObjects.Rectangle[] = []
  private enemySprites: Phaser.GameObjects.Sprite[] = []
  private chestSprites: Phaser.GameObjects.Image[] = []
  private keys!: {
    left: Phaser.Input.Keyboard.Key[]
    right: Phaser.Input.Keyboard.Key[]
    up: Phaser.Input.Keyboard.Key[]
    jump: Phaser.Input.Keyboard.Key[]
    down: Phaser.Input.Keyboard.Key[]
    attack: Phaser.Input.Keyboard.Key[]
    swap: Phaser.Input.Keyboard.Key[]
  }

  private onPause = () => this.scene.pause()
  private onResume = () => this.scene.resume()

  constructor() {
    super('GameScene')
  }

  /** Receives the level index, loop number and carried session across transitions. */
  init(data: { levelIndex?: number; loop?: number; session?: Session }): void {
    this.levelIndex = data.levelIndex ?? 0
    this.loop = data.loop ?? 1
    this.carriedSession = data.session ?? null
  }

  preload(): void {
    preloadSprites(this)
    preloadTiles(this)
  }

  create(): void {
    const height = this.scale.height
    createAnims(this)
    const level = LEVELS[this.levelIndex] ?? LEVELS[0]!
    this.start = { ...level.playerStart }
    // Loop 2 (the classic "second quest") is harder: less time, faster waves.
    const timeScale = this.loop >= 2 ? 0.75 : 1
    const spawnScale = this.loop >= 2 ? 0.65 : 1
    this.stageSeconds = Math.round(level.durationSeconds * timeScale)

    // Level geometry plus invisible world-boundary walls (left/right).
    this.solids = [
      ...level.solids,
      aabb(-40, -200, 40, height + 600),
      aabb(level.worldWidth, -200, 40, height + 600),
    ]
    // Static full-screen backdrop (ruins/forest at dusk) behind the world.
    this.cameras.main.setBackgroundColor(0x12141f)
    this.add
      .image(0, 0, backgroundFor(this.levelIndex))
      .setOrigin(0, 0)
      .setDisplaySize(this.scale.width, height)
      .setScrollFactor(0)
      .setDepth(-1000)

    // Geometry: small solids = wooden crate; everything else (ground + one-way
    // ledges) = the grassy ground tile, so floating platforms are clearly drawn.
    for (const s of this.solids) {
      if (s.x + s.w <= 0 || s.x >= level.worldWidth) continue // skip boundary walls
      if (!s.oneWay && s.w < 200) {
        this.add.image(s.x, s.y, TILE.crate).setOrigin(0, 0).setDisplaySize(s.w, s.h)
      } else {
        this.add.tileSprite(s.x, s.y, s.w, s.h, TILE.ground).setOrigin(0, 0)
      }
    }

    this.ladders = level.ladders.map((l) => l)
    for (const l of this.ladders) {
      // Drawn a touch wider than the thin (16px) hitbox so the rungs read.
      this.add
        .image(l.x + l.w / 2, l.y, TILE.ladder)
        .setOrigin(0.5, 0)
        .setDisplaySize(l.w + 12, l.h)
    }

    this.bounds = { minX: 0, maxX: level.worldWidth }
    this.stepper = createStepper(FIXED_DT)
    this.player = createPlayer(this.start.x, this.start.y)
    this.prev = this.player
    this.weapon = createWeapon()
    this.activeWeapon = LANCE
    this.session = this.carriedSession ?? createSession()
    this.over = false
    this.lastArmor = 'armored'
    this.enemies = []
    this.enemyFlash = []
    this.enemyProjectiles = []
    this.chests = (level.chests ?? []).map((c) => ({ ...c }))
    // Reset render pools: scene.restart() destroys all GameObjects, so the old
    // pooled sprites are dead — start fresh or we'd touch destroyed objects.
    this.projRects = []
    this.enemyProjRects = []
    this.enemySprites = []
    this.chestSprites = []
    this.timer = createTimer(this.stageSeconds)
    this.lastSecond = -1
    this.lastBossHp = -1
    this.bossCleared = false
    this.spawner = createSpawner(level.spawns.map((s) => ({ ...s, at: s.at * spawnScale })))

    this.knight = this.add.sprite(this.player.body.pos.x, this.player.body.pos.y, 'knight-idle')

    // Camera scrolls within the world, following the knight.
    this.cameras.main.setBounds(0, 0, level.worldWidth, height)
    this.cameras.main.startFollow(this.knight, true, 0.12, 0.12)

    // Fixed on-screen help, pinned to the bottom so it never overlaps the Vue
    // HUD (lives/score/time) which sits along the top of the canvas.
    this.add
      .text(
        12,
        height - 8,
        `${level.name} — ←/→ move · ↑ jump/climb · ↓ crouch · Space throw · Q swap weapon`,
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#cfd3e0',
          backgroundColor: '#00000066',
        },
      )
      .setScrollFactor(0)
      .setOrigin(0, 1)
      .setDepth(1000)

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
      swap: [k(K.Q)],
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
    bus.emit('game:weapon-changed', { weapon: this.activeWeapon.id })
    bus.emit('game:level-changed', { level: this.levelIndex + 1, loop: this.loop })
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

  update(time: number, delta: number): void {
    if (this.over) return
    // Weapon swap on key press (edge-detected, presentation-only choice).
    if (this.keys.swap.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.activeWeapon = nextWeapon(this.activeWeapon)
      bus.emit('game:weapon-changed', { weapon: this.activeWeapon.id })
    }
    const input = this.readInput()
    const alpha = this.stepper.advance(delta / 1000, () => this.tick(input))

    const pos = lerp(this.prev.body.pos, this.player.body.pos, alpha)
    // Armor state picks the skin: armored = Warrior_2 (plate), otherwise the
    // unarmored Warrior_3. An armor chest restores `armored` → plate is shown.
    const skin = this.player.armor.state === 'armored' ? 'knight_armored' : 'knight'
    this.applySprite(
      this.knight,
      skin,
      this.knightAnim(),
      { pos, w: PLAYER_W, h: PLAYER_H },
      this.player.facing,
    )
    // Blink while invulnerable (i-frames) after a hit.
    const blinking = this.player.armor.iFramesLeft > 0
    this.knight.setAlpha(blinking && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1)
    this.renderProjectiles()
    this.renderEnemyProjectiles()
    this.renderEnemies()
    this.renderChests()
  }

  /** One fixed simulation step: enemies, weapon, combat, player, session. */
  private tick(input: PlayerInput): void {
    if (this.over) return
    this.prev = this.player

    // Stage countdown: emit on each whole-second change; time-out costs a life.
    const t = tickTimer(this.timer, FIXED_DT)
    this.timer = t.timer
    const sec = Math.ceil(this.timer.secondsLeft)
    if (sec !== this.lastSecond) {
      this.lastSecond = sec
      bus.emit('game:time-changed', { secondsLeft: this.timer.secondsLeft })
    }
    if (t.expired) {
      this.onPlayerDead()
      return
    }

    // Spawn due enemies, then steer every enemy toward the player.
    const spawn = stepSpawner(this.spawner, FIXED_DT)
    this.spawner = spawn.spawner
    for (const ev of spawn.due) this.enemies.push(this.spawnEnemy(ev.kind, ev.x, ev.y))

    const b0 = this.player.body
    const target = { x: b0.pos.x + b0.w / 2, y: b0.pos.y + b0.h / 2 }
    const stepped = this.enemies.map((e) => stepEnemy(e, target, this.solids, FIXED_DT))
    this.enemies = stepped.map((r) => r.enemy)
    for (const r of stepped) if (r.fired.length) this.enemyProjectiles.push(...r.fired)
    this.enemyProjectiles = advanceProjectiles(
      this.enemyProjectiles,
      FIXED_DT,
      this.bounds,
      this.solids,
    )

    if (input.attack) {
      const b = this.player.body
      const w = this.activeWeapon
      const originX = this.player.facing > 0 ? b.pos.x + b.w : b.pos.x - w.w
      const originY = b.pos.y + b.h / 2
      this.weapon = fire(this.weapon, w, originX, originY, this.player.facing)
    }
    this.weapon = stepWeapon(this.weapon, FIXED_DT, this.bounds, this.solids)

    // Crouching shrinks the player's hitbox (feet planted) so it can duck shots.
    const b = this.player.body
    const ph = this.player.state === 'crouch' ? CROUCH_H : b.h
    const playerBox = aabb(b.pos.x, b.pos.y + (b.h - ph), b.w, ph)
    const before = this.enemies
    const result = resolveCombat(playerBox, this.weapon.projectiles, this.enemies)
    this.weapon = { ...this.weapon, projectiles: result.projectiles }
    this.enemies = result.enemies as Enemy[]
    // Juice: flash an enemy white the moment its HP drops (index order is stable).
    this.enemyFlash = this.enemyFlash.map((t) => Math.max(0, t - FIXED_DT))
    this.enemies.forEach((e, i) => {
      const prev = before[i]
      if (prev && e.hp < prev.hp) this.enemyFlash[i] = HIT_FLASH
    })
    this.emitBossHp()

    if (result.kills > 0) {
      this.session = addScore(this.session, result.kills * SCORE_PER_KILL)
      bus.emit('game:score-changed', { score: this.session.score })
      this.cameras.main.shake(90, 0.006) // a small kick on each kill
    }

    // Enemy projectiles vs the player.
    const ep = resolveEnemyProjectiles(playerBox, this.enemyProjectiles)
    this.enemyProjectiles = [...ep.projectiles]
    const damaged = result.playerHit || ep.playerHit

    this.player = stepPlayer(
      this.player,
      input,
      { solids: this.solids, ladders: this.ladders, damaged },
      FIXED_DT,
    )

    // Open any chest the knight is touching, apply its reward and announce it.
    if (this.chests.length > 0) {
      const pb = this.player.body
      const opened = openChests(aabb(pb.pos.x, pb.pos.y, pb.w, pb.h), this.chests)
      if (opened.rewards.length > 0) {
        this.chests = opened.chests as Chest[]
        opened.rewards.forEach((reward, n) => {
          const fb = this.applyChestReward(reward)
          this.floatReward(pb.pos.x + pb.w / 2, pb.pos.y - n * 18, fb.label, fb.color)
        })
      }
    }

    if (this.player.armor.state !== this.lastArmor) {
      this.lastArmor = this.player.armor.state
      bus.emit('game:armor-changed', { armor: this.lastArmor })
      this.cameras.main.shake(150, 0.01) // juice: jolt when the knight is hit
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

  /**
   * Apply a chest reward to the player/session and notify the HUD. Returns a
   * label + color for the floating pickup text so the player sees what they got.
   */
  private applyChestReward(reward: ChestReward): { label: string; color: string } {
    switch (reward.kind) {
      case 'weapon': {
        const def = weaponById(reward.weaponId)
        if (def) {
          this.activeWeapon = def
          bus.emit('game:weapon-changed', { weapon: def.id })
        }
        const color = GameScene.WEAPON_COLOR[reward.weaponId] ?? 0xffffff
        return { label: `${reward.weaponId.toUpperCase()}!`, color: hexColor(color) }
      }
      case 'curse':
        // The magician's curse downgrades you back to the starting lance.
        this.activeWeapon = LANCE
        bus.emit('game:weapon-changed', { weapon: LANCE.id })
        return { label: 'CURSED!', color: '#ff5555' }
      case 'armor':
        this.player = { ...this.player, armor: pickupArmor(this.player.armor) }
        return { label: 'ARMOR!', color: '#7fdfff' }
      case 'points':
        this.session = addScore(this.session, reward.points)
        bus.emit('game:score-changed', { score: this.session.score })
        return { label: `+${reward.points}`, color: '#ffd23a' }
      case 'life':
        this.session = gainLife(this.session)
        bus.emit('game:lives-changed', { lives: this.session.lives })
        return { label: '1UP!', color: '#7cfc00' }
    }
  }

  /** A short-lived label that floats up and fades (chest pickups). */
  private floatReward(x: number, y: number, label: string, color: string): void {
    const t = this.add
      .text(x, y - 6, label, {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1)
      .setDepth(1500)
    this.tweens.add({
      targets: t,
      y: y - 52,
      scale: { from: 0.7, to: 1 },
      alpha: { from: 1, to: 0 },
      duration: 1300,
      ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    })
  }

  /** A centered banner (e.g. "STAGE CLEAR!") that pops in and holds. */
  private showBanner(text: string): void {
    const cam = this.cameras.main
    const banner = this.add
      .text(cam.width / 2, cam.height / 2, text, {
        fontFamily: 'monospace',
        fontSize: '38px',
        color: '#ffd23a',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000)
    this.tweens.add({
      targets: banner,
      scale: { from: 0.5, to: 1 },
      duration: 320,
      ease: 'Back.out',
    })
  }

  /** Emit the boss HP to the HUD (bar) and a one-time cleared event when it dies. */
  private emitBossHp(): void {
    const boss = this.enemies.find((e) => e.kind === 'boss')
    if (!boss) return
    if (boss.state !== 'dead') {
      if (boss.hp !== this.lastBossHp) {
        this.lastBossHp = boss.hp
        bus.emit('game:boss-hp', { hp: boss.hp, maxHp: BOSS.hp })
      }
    } else if (!this.bossCleared) {
      this.bossCleared = true
      bus.emit('game:boss-cleared')
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
      case 'plant':
        return createPlant(x, y)
      case 'boss':
        return createBoss(x, y)
    }
  }

  private onPlayerDead(): void {
    this.cameras.main.shake(320, 0.02) // juice: heavy shake on death
    this.session = loseLife(this.session)
    bus.emit('game:lives-changed', { lives: this.session.lives })
    if (this.session.state === 'gameover') {
      this.over = true
      bus.emit('game:over', { score: this.session.score })
    } else {
      this.player = createPlayer(this.start.x, this.start.y)
      this.prev = this.player
      this.lastArmor = 'armored'
      this.timer = createTimer(this.stageSeconds)
      this.lastSecond = -1
      bus.emit('game:armor-changed', { armor: 'armored' })
    }
  }

  /**
   * Stage cleared: advance to the next level, start the harder second loop after
   * the last stage of loop 1, or win the game after clearing loop 2. Session carried.
   */
  private onWin(): void {
    this.over = true
    const lastLevel = this.levelIndex >= LEVELS.length - 1

    // Beating the final stage of loop 2 is the true victory (no next stage).
    if (lastLevel && this.loop >= 2) {
      this.showBanner('TRUE VICTORY!')
      this.session = win(this.session)
      this.time.delayedCall(STAGE_CLEAR_MS, () =>
        bus.emit('game:won', { score: this.session.score }),
      )
      return
    }

    // Otherwise announce the clear, then advance after a short hold.
    const next = lastLevel
      ? { levelIndex: 0, loop: this.loop + 1, session: this.session } // into loop 2
      : { levelIndex: this.levelIndex + 1, loop: this.loop, session: this.session }
    this.showBanner(lastLevel ? 'LOOP 1 CLEAR!\nTHE QUEST BEGINS AGAIN' : 'STAGE CLEAR!')
    this.time.delayedCall(STAGE_CLEAR_MS, () => this.scene.restart(next))
  }

  /** Greybox color per weapon id (until the art pass swaps in sprites). */
  private static readonly WEAPON_COLOR: Record<string, number> = {
    lance: 0xffcc00,
    dagger: 0xc0c0c0,
    torch: 0xff7a1a,
    axe: 0x66ccff,
  }

  /** Sync the projectile rectangle pool to the current weapon state. */
  private renderProjectiles(): void {
    const projectiles = this.weapon.projectiles
    const color = GameScene.WEAPON_COLOR[this.activeWeapon.id] ?? 0xffcc00
    while (this.projRects.length < projectiles.length) {
      this.projRects.push(this.add.rectangle(0, 0, LANCE.w, LANCE.h, 0xffcc00).setOrigin(0, 0))
    }
    this.projRects.forEach((rect, i) => {
      const p = projectiles[i]
      if (p)
        rect.setVisible(true).setPosition(p.pos.x, p.pos.y).setSize(p.w, p.h).setFillStyle(color)
      else rect.setVisible(false)
    })
  }

  /** Sync the enemy-projectile rectangle pool. */
  private renderEnemyProjectiles(): void {
    while (this.enemyProjRects.length < this.enemyProjectiles.length) {
      this.enemyProjRects.push(this.add.rectangle(0, 0, 1, 1, 0xff4444).setOrigin(0, 0))
    }
    this.enemyProjRects.forEach((rect, i) => {
      const p = this.enemyProjectiles[i]
      if (p) rect.setVisible(true).setPosition(p.pos.x, p.pos.y).setSize(p.w, p.h)
      else rect.setVisible(false)
    })
  }

  /** Sync the enemy sprite pool; dead enemies are hidden, animated per kind. */
  private renderEnemies(): void {
    while (this.enemySprites.length < this.enemies.length) {
      this.enemySprites.push(this.add.sprite(0, 0, 'zombie-idle'))
    }
    this.enemySprites.forEach((sprite, i) => {
      const e = this.enemies[i]
      if (e && e.state !== 'dead') {
        sprite.setVisible(true)
        this.applySprite(sprite, e.kind, enemyAnim(e.state), e.body, e.facing)
        if ((this.enemyFlash[i] ?? 0) > 0) sprite.setTintFill(0xffffff)
        else sprite.clearTint()
      } else {
        sprite.setVisible(false)
      }
    })
  }

  /** Map the player FSM state to a knight animation state. */
  private knightAnim(): string {
    switch (this.player.state) {
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
  private applySprite(
    sprite: Phaser.GameObjects.Sprite,
    entity: string,
    state: string,
    body: { pos: { x: number; y: number }; w: number; h: number },
    facing: 1 | -1,
  ): void {
    const def = SPRITES[entity]!
    const animState = hasAnim(entity, state)
      ? state
      : hasAnim(entity, 'idle')
        ? 'idle'
        : Object.keys(def.states)[0]!
    sprite.play(animKey(entity, animState), true)
    sprite.setScale(def.scale).setFlipX(facing < 0)
    const cx = body.pos.x + body.w / 2
    if (def.center) {
      sprite.setOrigin(0.5, 0.5).setPosition(cx, body.pos.y + body.h / 2)
    } else {
      sprite.setOrigin(0.5, 1).setPosition(cx, body.pos.y + body.h + def.foot * def.scale)
    }
  }

  /** Sync the chest sprite pool; opened chests are hidden. */
  private renderChests(): void {
    while (this.chestSprites.length < this.chests.length) {
      this.chestSprites.push(this.add.image(0, 0, TILE.chest).setOrigin(0.5, 1))
    }
    this.chestSprites.forEach((sprite, i) => {
      const c = this.chests[i]
      if (c && !c.opened) {
        // Drawn a bit larger than the hitbox, sitting on its bottom edge.
        sprite
          .setVisible(true)
          .setDisplaySize(c.w + 10, c.h + 12)
          .setPosition(c.x + c.w / 2, c.y + c.h)
      } else {
        sprite.setVisible(false)
      }
    })
  }
}
