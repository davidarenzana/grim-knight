import Phaser from 'phaser'
import { lerp } from '@core/math/vector'
import { createRng } from '@core/math/rng'
import { createStepper, type Stepper } from '@core/sim/loop'
import { type Player, type PlayerInput, PLAYER_W, PLAYER_H } from '@core/fsm/player'
import { nextWeapon, LANCE } from '@core/weapons/weapon'
import { LEVELS } from '@core/level/level'
import { type ChestReward } from '@core/level/chest'
import { win, type Session } from '@core/rules/session'
import {
  createMatch,
  stepMatch,
  FIXED_DT,
  type MatchConfig,
  type MatchState,
  type Effect,
  type GameNotification,
} from '@core/app'
import {
  preloadSprites,
  createAnims,
  animKey,
  hasAnim,
  SPRITES,
  preloadWeapons,
  createWeaponAnims,
  weaponAnimKey,
  hasWeaponSprite,
  preloadEnemyProjectiles,
  createEnemyProjectileAnims,
  enemyProjectileVisual,
} from '@engine/assets/sprites'
import { preloadTiles, bgKey, groundKey, hazardKey, TILE } from '@engine/assets/tiles'
import {
  preloadEffects,
  createEffectAnims,
  preloadIcons,
  playEffect,
  rewardIcon,
  ICON,
} from '@engine/assets/effects'
import { bus } from '@shared/events'
import { consumeStartLevel } from '@engine/session-start'

/** Map a core enemy state to a sprite animation state (idle/walk/dead). */
const enemyAnim = (state: string): string =>
  state === 'dead' ? 'dead' : state === 'walking' ? 'walk' : 'idle'

const HIT_FLASH = 0.1 // seconds an enemy flashes white after taking a hit
const STAGE_CLEAR_MS = 1700 // banner hold before advancing to the next stage

/** Pixel UI font shared with the Vue HUD. Latin subset only — no arrow glyphs. */
const UI_FONT = '"Press Start 2P", monospace'

/**
 * Main game scene. It RENDERS the state produced by the pure `core/` simulation
 * (fixed-timestep stepper + interpolation), translates keyboard input, runs the
 * combat/session rules from `core/`, and emits `game:*` events to the Vue HUD.
 * No game logic lives here — only presentation, IO and orchestration.
 */
export class GameScene extends Phaser.Scene {
  private stepper!: Stepper
  /** Domain + application state and its static config, produced by `createMatch`. */
  private config!: MatchConfig
  private state!: MatchState
  /** Player snapshot from the previous fixed step, for render interpolation. */
  private prev!: Player

  // Render-derived juice (NOT gameplay): per-enemy white hit-flash timer, the
  // last HP seen at render (to detect a fresh hit), and a one-shot death-burst guard.
  private enemyFlash: number[] = []
  private enemyHp: number[] = []
  private enemyExploded: boolean[] = []

  // Carried across stage transitions via scene.restart().
  private levelIndex = 0
  private loop = 1
  private carriedSession: Session | null = null

  private knight!: Phaser.GameObjects.Sprite
  private projSprites: Phaser.GameObjects.Sprite[] = []
  private projRects: Phaser.GameObjects.Rectangle[] = [] // fallback when a weapon has no art
  private enemyProjRects: Phaser.GameObjects.Rectangle[] = []
  private enemyProjSprites: Phaser.GameObjects.Sprite[] = []
  private enemySprites: Phaser.GameObjects.Sprite[] = []
  private chestSprites: Phaser.GameObjects.Image[] = []
  private dropSprites: Phaser.GameObjects.Image[] = []
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
    // On the first boot there's no transition data: start at the level the menu
    // picked (level select), defaulting to the first stage.
    this.levelIndex = data.levelIndex ?? consumeStartLevel()
    this.loop = data.loop ?? 1
    this.carriedSession = data.session ?? null
  }

  preload(): void {
    preloadSprites(this)
    preloadWeapons(this)
    preloadTiles(this)
    preloadEffects(this)
    preloadIcons(this)
    preloadEnemyProjectiles(this)
  }

  create(): void {
    // `view` is the camera viewport (fixed UI/backdrop space); `worldHeight` is
    // the scrollable world, taller than the viewport for vertical tower stages.
    const view = this.scale.height
    createAnims(this)
    createWeaponAnims(this)
    createEffectAnims(this)
    createEnemyProjectileAnims(this)
    const level = LEVELS[this.levelIndex] ?? LEVELS[0]!
    const worldHeight = level.worldHeight ?? view

    // Build the match: geometry, spawner, rolled chest loot and timer are pure
    // (core/app). Seed the loot RNG off the wall clock here (engine-side, allowed),
    // mixed with stage/loop so two chests on the same screen don't share a roll.
    const rng = createRng(
      (Date.now() ^ (this.levelIndex * 0x9e3779b1) ^ (this.loop * 0x85ebca6b)) >>> 0,
    )
    const match = createMatch(level, {
      levelIndex: this.levelIndex,
      loop: this.loop,
      rng,
      viewHeight: view,
      ...(this.carriedSession ? { session: this.carriedSession } : {}),
    })
    this.config = match.config
    this.state = match.state
    this.prev = this.state.player
    this.stepper = createStepper(FIXED_DT)

    // Static full-screen backdrop (ruins/forest at dusk) behind the world.
    this.cameras.main.setBackgroundColor(0x12141f)
    this.add
      .image(0, 0, bgKey(level.theme))
      .setOrigin(0, 0)
      .setDisplaySize(this.scale.width, view)
      .setScrollFactor(0)
      .setDepth(-1000)

    // Geometry: small solids = wooden crate; everything else (ground + one-way
    // ledges) = the grassy ground tile, so floating platforms are clearly drawn.
    for (const s of this.config.solids) {
      if (s.x + s.w <= 0 || s.x >= level.worldWidth) continue // skip boundary walls
      if (!s.oneWay && s.w < 200) {
        this.add.image(s.x, s.y, TILE.crate).setOrigin(0, 0).setDisplaySize(s.w, s.h)
      } else {
        this.add.tileSprite(s.x, s.y, s.w, s.h, groundKey(level.theme)).setOrigin(0, 0)
      }
    }

    for (const l of this.config.ladders) {
      // Drawn a touch wider than the thin (16px) hitbox so the rungs read.
      this.add
        .image(l.x + l.w / 2, l.y, TILE.ladder)
        .setOrigin(0.5, 0)
        .setDisplaySize(l.w + 12, l.h)
    }

    // Hazards (spikes/lava): painted with the theme's hazard tile; the damage
    // check itself lives in stepMatch.
    for (const h of this.config.hazards) {
      this.add.tileSprite(h.x, h.y, h.w, h.h, hazardKey(level.theme)).setOrigin(0, 0)
    }

    // Reset render pools + juice trackers: scene.restart() destroys all
    // GameObjects, so the old pooled sprites are dead — start fresh or we'd touch
    // destroyed objects.
    this.projSprites = []
    this.projRects = []
    this.enemyProjRects = []
    this.enemyProjSprites = []
    this.enemySprites = []
    this.chestSprites = []
    this.dropSprites = []
    this.enemyFlash = []
    this.enemyHp = []
    this.enemyExploded = []

    this.knight = this.add.sprite(
      this.state.player.body.pos.x,
      this.state.player.body.pos.y,
      'knight-idle',
    )

    // Camera scrolls within the world (horizontally and, for tower stages,
    // vertically), following the knight.
    this.cameras.main.setBounds(0, 0, level.worldWidth, worldHeight)
    this.cameras.main.startFollow(this.knight, true, 0.12, 0.12)

    // Fixed on-screen help, pinned to the bottom so it never overlaps the Vue
    // HUD (lives/score/time) which sits along the top of the canvas.
    this.add
      .text(
        10,
        view - 8,
        `${level.name.toUpperCase()}   MOVE ←→  JUMP ↑  CROUCH ↓  THROW Z  SWAP X`,
        {
          fontFamily: UI_FONT,
          fontSize: '10px',
          color: '#f4ead2',
          backgroundColor: '#000000aa',
          padding: { x: 7, y: 5 },
        },
      )
      .setScrollFactor(0)
      .setOrigin(0, 1)
      .setDepth(1000)

    const kb = this.input.keyboard!
    const k = (code: number) => kb.addKey(code)
    const K = Phaser.Input.Keyboard.KeyCodes
    // Controls (NES-style): arrows move with the right hand; Z throws and X
    // swaps weapons with the left hand. Up jumps (or climbs on a ladder); Down
    // crouches (or climbs down). Up is mapped to both `up` and `jump` — the FSM
    // climbs when on a ladder and jumps otherwise. WASD and Space are kept as
    // alternates so either hand layout still works.
    this.keys = {
      left: [k(K.LEFT), k(K.A)],
      right: [k(K.RIGHT), k(K.D)],
      up: [k(K.UP), k(K.W)],
      jump: [k(K.UP), k(K.W)],
      down: [k(K.DOWN), k(K.S)],
      attack: [k(K.Z), k(K.SPACE)],
      swap: [k(K.X)],
    }

    // Pause/resume driven by the UI; cleaned up when the scene shuts down.
    bus.on('ui:pause', this.onPause)
    bus.on('ui:resume', this.onResume)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off('ui:pause', this.onPause)
      bus.off('ui:resume', this.onResume)
    })

    // Initial HUD state (read from the freshly-built match).
    bus.emit('game:ready')
    bus.emit('game:armor-changed', { armor: this.state.player.armor.state })
    bus.emit('game:lives-changed', { lives: this.state.session.lives })
    bus.emit('game:score-changed', { score: this.state.session.score })
    bus.emit('game:weapon-changed', { weapon: this.state.activeWeapon.id })
    bus.emit('game:time-changed', { secondsLeft: this.state.timer.secondsLeft })
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
    // Edge-detected weapon swap (presentation-only) — only while playing.
    if (
      this.state.phase === 'playing' &&
      this.keys.swap.some((key) => Phaser.Input.Keyboard.JustDown(key))
    ) {
      this.state = { ...this.state, activeWeapon: nextWeapon(this.state.activeWeapon) }
      bus.emit('game:weapon-changed', { weapon: this.state.activeWeapon.id })
    }

    let alpha = 1
    if (this.state.phase === 'playing') {
      const input = this.readInput()
      alpha = this.stepper.advance(delta / 1000, () => this.step(input))
    }
    // Decay the render-only hit-flash by real time.
    this.enemyFlash = this.enemyFlash.map((t) => Math.max(0, t - delta / 1000))

    const player = this.state.player
    const pos = lerp(this.prev.body.pos, player.body.pos, alpha)
    // Armor state picks the skin: armored = Warrior_2 (plate), otherwise the
    // unarmored Warrior_3. An armor chest restores `armored` → plate is shown.
    const skin = player.armor.state === 'armored' ? 'knight_armored' : 'knight'
    this.applySprite(
      this.knight,
      skin,
      this.knightAnim(),
      { pos, w: PLAYER_W, h: PLAYER_H },
      player.facing,
    )
    // The knight pack has no crouch sheet, so ducking would just freeze on idle.
    // Squash the pose vertically (and widen slightly) so the crouch reads: the
    // foot-aligned origin keeps the boots planted while the head drops.
    if (player.state === 'crouch') {
      // setScale leaves the flipX set by applySprite intact, so keep X positive.
      const s = SPRITES[skin]!.scale
      this.knight.setScale(s * 1.08, s * 0.62)
    }
    // Blink while invulnerable (i-frames) after a hit.
    const blinking = player.armor.iFramesLeft > 0
    this.knight.setAlpha(blinking && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1)
    this.renderProjectiles()
    this.renderEnemyProjectiles()
    this.renderEnemies()
    this.renderChests()
    this.renderDrops()
  }

  /** One fixed step: advance the pure use case, then present its effects. */
  private step(input: PlayerInput): void {
    if (this.state.phase !== 'playing') return
    this.prev = this.state.player
    const { state, effects } = stepMatch(this.config, this.state, input, FIXED_DT)
    this.state = state
    this.runEffects(effects)
    // Stage cleared: the adapter owns the scene transition (banner + advance).
    // `gameover` needs no extra work — the 'over' notification already fired and
    // the render loop simply freezes on the final frame.
    if (state.phase === 'cleared') this.onWin()
  }

  /** Interpret the application's presentation effects against Phaser / the bus. */
  private runEffects(effects: readonly Effect[]): void {
    for (const e of effects) {
      switch (e.type) {
        case 'shake':
          this.cameras.main.shake(e.ms, e.intensity)
          break
        case 'vfx':
          playEffect(this, e.name, e.x, e.y, e.scale)
          break
        case 'float':
          // The sparkle burst comes through as its own `vfx` effect; here we pop
          // the reward icon (a touch above the label) and the floating label.
          this.floatRewardIcon(e.x, e.y + 24, e.reward)
          this.floatReward(e.x, e.y, e.label, e.color)
          break
        case 'notify':
          this.emitNotification(e.notification)
          break
      }
    }
  }

  /** Map an application notification onto the UI event bus. */
  private emitNotification(n: GameNotification): void {
    switch (n.kind) {
      case 'score':
        bus.emit('game:score-changed', { score: n.score })
        break
      case 'lives':
        bus.emit('game:lives-changed', { lives: n.lives })
        break
      case 'armor':
        bus.emit('game:armor-changed', { armor: n.armor })
        break
      case 'weapon':
        bus.emit('game:weapon-changed', { weapon: n.weapon })
        break
      case 'time':
        bus.emit('game:time-changed', { secondsLeft: n.secondsLeft })
        break
      case 'level':
        bus.emit('game:level-changed', { level: n.level, loop: n.loop })
        break
      case 'boss-hp':
        bus.emit('game:boss-hp', { hp: n.hp, maxHp: n.maxHp })
        break
      case 'boss-cleared':
        bus.emit('game:boss-cleared')
        break
      case 'over':
        bus.emit('game:over', { score: n.score })
        break
      case 'won':
        bus.emit('game:won', { score: n.score })
        break
    }
  }

  /**
   * Pop a chest reward's icon out of the chest: it scales up with a little
   * bounce, then drifts up and fades. Weapons show their projectile art, the
   * rest show a dungeon item icon (heart/coin/gem/star).
   */
  private floatRewardIcon(x: number, y: number, reward: ChestReward): void {
    const icon = rewardIcon(reward)
    const spr = this.add
      .image(x, y, icon.key, icon.frame)
      .setOrigin(0.5, 0.5)
      .setDepth(1450)
      .setScale(0.4)
    if (icon.tint !== undefined) spr.setTint(icon.tint)
    this.tweens.add({
      targets: spr,
      scale: 0.95,
      y: y - 22,
      duration: 600,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: spr,
          y: y - 44,
          alpha: 0,
          duration: 650,
          ease: 'Cubic.in',
          onComplete: () => spr.destroy(),
        })
      },
    })
  }

  /** A short-lived label that floats up and fades (chest pickups). */
  private floatReward(x: number, y: number, label: string, color: string): void {
    const t = this.add
      .text(x, y - 6, label, {
        fontFamily: UI_FONT,
        fontSize: '12px',
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
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: '#ffd23a',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center',
        lineSpacing: 8,
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

  /**
   * Stage cleared (driven by the `cleared` phase from stepMatch): advance to the
   * next level, start the harder second loop after the last stage of loop 1, or
   * win the game after clearing loop 2. Session carried across the transition.
   */
  private onWin(): void {
    const lastLevel = this.levelIndex >= LEVELS.length - 1
    const session = this.state.session

    // Beating the final stage of loop 2 is the true victory (no next stage).
    if (lastLevel && this.loop >= 2) {
      this.showBanner('TRUE VICTORY!')
      const won = win(session)
      this.time.delayedCall(STAGE_CLEAR_MS, () => bus.emit('game:won', { score: won.score }))
      return
    }

    // Otherwise announce the clear, then advance after a short hold.
    const next = lastLevel
      ? { levelIndex: 0, loop: this.loop + 1, session } // into loop 2
      : { levelIndex: this.levelIndex + 1, loop: this.loop, session }
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

  /**
   * Sync the player projectile pool. Uses the active weapon's animated sprite
   * (spear/dagger/torch/axe) centered on each projectile and flipped by travel
   * direction; falls back to a colored rectangle if a weapon has no art.
   */
  private renderProjectiles(): void {
    const projectiles = this.state.weapon.projectiles
    const id = this.state.activeWeapon.id

    if (hasWeaponSprite(this, id)) {
      const key = weaponAnimKey(id)
      while (this.projSprites.length < projectiles.length) {
        this.projSprites.push(this.add.sprite(0, 0, key).setOrigin(0.5, 0.5).setScale(0.7))
      }
      this.projSprites.forEach((spr, i) => {
        const p = projectiles[i]
        if (p) {
          spr.setVisible(true)
          spr.play(key, true)
          spr.setPosition(p.pos.x + p.w / 2, p.pos.y + p.h / 2)
          spr.setFlipX(p.vel.x < 0)
        } else {
          spr.setVisible(false)
        }
      })
      this.projRects.forEach((r) => r.setVisible(false))
      return
    }

    // Fallback: colored rectangles (a weapon without art).
    const color = GameScene.WEAPON_COLOR[id] ?? 0xffcc00
    while (this.projRects.length < projectiles.length) {
      this.projRects.push(this.add.rectangle(0, 0, LANCE.w, LANCE.h, 0xffcc00).setOrigin(0, 0))
    }
    this.projRects.forEach((rect, i) => {
      const p = projectiles[i]
      if (p)
        rect.setVisible(true).setPosition(p.pos.x, p.pos.y).setSize(p.w, p.h).setFillStyle(color)
      else rect.setVisible(false)
    })
    this.projSprites.forEach((s) => s.setVisible(false))
  }

  /**
   * Sync the enemy-projectile pools. A shot with a known `sprite` tag (fireball,
   * bullet, spore, bolt) draws an animated/tinted sprite; anything else falls
   * back to the red rectangle. Each pool index shows at most one of the two.
   */
  private renderEnemyProjectiles(): void {
    const ps = this.state.enemyProjectiles
    while (this.enemyProjRects.length < ps.length) {
      this.enemyProjRects.push(this.add.rectangle(0, 0, 1, 1, 0xff4444).setOrigin(0.5, 0.5))
    }
    while (this.enemyProjSprites.length < ps.length) {
      this.enemyProjSprites.push(this.add.sprite(0, 0, 'eproj-img-bolt').setOrigin(0.5, 0.5))
    }
    const n = Math.max(this.enemyProjRects.length, this.enemyProjSprites.length)
    for (let i = 0; i < n; i++) {
      const p = ps[i]
      const rect = this.enemyProjRects[i]
      const spr = this.enemyProjSprites[i]
      const visual = p?.sprite ? enemyProjectileVisual(p.sprite) : undefined
      if (p && visual && spr) {
        const cx = p.pos.x + p.w / 2
        const cy = p.pos.y + p.h / 2
        spr
          .setVisible(true)
          .setPosition(cx, cy)
          .setFlipX(p.vel.x < 0)
        if (visual.anim) {
          spr.play(visual.anim, true)
          const d = Math.max(p.w, p.h) * 2.4
          spr.setDisplaySize(d, d)
        } else {
          // Stop any anim left over from a previous (animated) projectile reusing
          // this pooled sprite, else it would override the static texture frame.
          spr.anims.stop()
          spr.setTexture(visual.texture)
          spr.setDisplaySize(p.w * 1.3, p.h * 1.3)
        }
        if (visual.tint !== undefined) spr.setTintFill(visual.tint)
        else spr.clearTint()
        rect?.setVisible(false)
      } else if (p && rect) {
        rect
          .setVisible(true)
          .setPosition(p.pos.x + p.w / 2, p.pos.y + p.h / 2)
          .setSize(p.w, p.h)
        spr?.setVisible(false)
      } else {
        rect?.setVisible(false)
        spr?.setVisible(false)
      }
    }
  }

  /**
   * Sync the enemy sprite pool; dead enemies are hidden, animated per kind. The
   * render-only white hit-flash is derived here by diffing each enemy's HP since
   * the last frame (the simulation no longer tracks this presentation detail).
   */
  private renderEnemies(): void {
    const enemies = this.state.enemies
    while (this.enemySprites.length < enemies.length) {
      this.enemySprites.push(this.add.sprite(0, 0, 'zombie-idle'))
    }
    this.enemySprites.forEach((sprite, i) => {
      const e = enemies[i]
      // Flash white the frame an enemy's HP drops (juice; render-derived).
      if (e && e.hp < (this.enemyHp[i] ?? Infinity) && e.state !== 'dead') {
        this.enemyFlash[i] = HIT_FLASH
      }
      if (e) this.enemyHp[i] = e.hp
      if (e && e.state !== 'dead') {
        sprite.setVisible(true)
        // The boss kind paints with its variant skin (boss1/2/3).
        const entity = e.kind === 'boss' ? `boss${e.variant ?? 1}` : e.kind
        this.applySprite(sprite, entity, enemyAnim(e.state), e.body, e.facing)
        if ((this.enemyFlash[i] ?? 0) > 0) sprite.setTintFill(0xffffff)
        else sprite.clearTint()
      } else {
        // First frame an enemy is dead: pop a one-shot explosion at its center
        // (bigger for a boss), then leave the sprite hidden for good.
        if (e && e.state === 'dead' && !this.enemyExploded[i]) {
          this.enemyExploded[i] = true
          const cx = e.body.pos.x + e.body.w / 2
          const cy = e.body.pos.y + e.body.h / 2
          playEffect(this, 'explosion', cx, cy, e.kind === 'boss' ? 0.7 : 0.32)
          this.cameras.main.shake(e.kind === 'boss' ? 260 : 80, e.kind === 'boss' ? 0.012 : 0.004)
        }
        sprite.setVisible(false)
      }
    })
  }

  /** Map the player FSM state to a knight animation state. */
  private knightAnim(): string {
    switch (this.state.player.state) {
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
    while (this.chestSprites.length < this.state.chests.length) {
      this.chestSprites.push(this.add.image(0, 0, TILE.chest).setOrigin(0.5, 1))
    }
    this.chestSprites.forEach((sprite, i) => {
      const c = this.state.chests[i]
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

  /** Sync the enemy-drop pool: each uncollected drop shows its reward icon, bobbing. */
  private renderDrops(): void {
    while (this.dropSprites.length < this.state.drops.length) {
      this.dropSprites.push(this.add.image(0, 0, ICON.heart).setOrigin(0.5, 0.5).setDepth(60))
    }
    const t = this.time.now
    this.dropSprites.forEach((spr, i) => {
      const d = this.state.drops[i]
      if (d && !d.opened) {
        const icon = rewardIcon(d.reward)
        spr.setVisible(true).setTexture(icon.key, icon.frame ?? 0)
        if (icon.tint !== undefined) spr.setTint(icon.tint)
        else spr.clearTint()
        const bob = Math.sin(t / 220 + i) * 3
        spr.setDisplaySize(d.w + 6, d.h + 6).setPosition(d.x + d.w / 2, d.y + d.h / 2 + bob)
      } else {
        spr.setVisible(false)
      }
    })
  }
}
