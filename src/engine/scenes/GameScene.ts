import Phaser from 'phaser'
import { aabb } from '@core/math/aabb'
import { createRng } from '@core/math/rng'
import { createStepper, type Stepper } from '@core/sim/loop'
import { type Player } from '@core/fsm/player'
import { nextOwnedWeapon } from '@core/weapons/weapon'
import { LEVELS } from '@core/level/level'
import { type ChestReward } from '@core/level/chest'
import { type Session } from '@core/rules/session'
import { difficultyForLoop } from '@core/rules/difficulty'
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
  preloadWeapons,
  createWeaponAnims,
  preloadEnemyProjectiles,
  createEnemyProjectileAnims,
} from '@engine/assets/sprites'
import { preloadTiles, bgKey, groundKey, hazardKey, TILE } from '@engine/assets/tiles'
import {
  preloadEffects,
  createEffectAnims,
  preloadIcons,
  playEffect,
  rewardIcon,
} from '@engine/assets/effects'
import { bus } from '@shared/events'
import { playSfx, startMusic, stopMusic } from '@engine/audio'
import { createKeymap, readInput, swapJustPressed, type Keymap } from '@engine/input/keymap'
import { WorldRenderer } from '@engine/render/WorldRenderer'
import {
  UI_FONT,
  COLOR,
  DEPTH,
  DURATION,
  BANNER,
  CAMERA_FOLLOW_LERP,
  CRATE_MAX_W,
  LADDER_DRAW_PAD,
  LADDER_TILE_SIZE,
  HELP_TEXT,
  FLOAT_LABEL,
  REWARD_ICON,
  STAGE_CLEAR_MS,
  SEED_MIX,
} from '@engine/render/theme'

/** Registry key the first GameScene reads to learn which stage to start at. */
export const START_LEVEL_KEY = 'startLevel'

/**
 * Main game scene. It RENDERS the state produced by the pure `core/` simulation
 * (fixed-timestep stepper + interpolation, drawn by {@link WorldRenderer}),
 * translates keyboard input ({@link createKeymap}), runs the use case from
 * `core/app`, and interprets its presentation effects (camera shake, VFX,
 * floating labels) onto Phaser and the Vue HUD bus. No game logic lives here —
 * only presentation, IO and orchestration.
 */
export class GameScene extends Phaser.Scene {
  private stepper!: Stepper
  /** Domain + application state and its static config, produced by `createMatch`. */
  private config!: MatchConfig
  private state!: MatchState
  /** Player snapshot from the previous fixed step, for render interpolation. */
  private prev!: Player
  private world!: WorldRenderer
  private keys!: Keymap

  // Carried across stage transitions via scene.restart().
  private levelIndex = 0
  private loop = 1
  private carriedSession: Session | null = null
  private carriedOwnedWeapons: readonly string[] | null = null
  private carriedActiveWeapon: string | null = null

  private onPause = () => this.scene.pause()
  private onResume = () => this.scene.resume()

  constructor() {
    super('GameScene')
  }

  /** Receives the level index, loop number, carried session and carried arsenal
   *  (owned + equipped weapons) across transitions. */
  init(data: {
    levelIndex?: number
    loop?: number
    session?: Session
    ownedWeapons?: readonly string[]
    activeWeapon?: string
  }): void {
    // On the first boot there's no transition data: start at the level the menu
    // picked (read from the game registry), defaulting to the first stage.
    this.levelIndex =
      data.levelIndex ?? (this.registry.get(START_LEVEL_KEY) as number | undefined) ?? 0
    this.loop = data.loop ?? 1
    this.carriedSession = data.session ?? null
    this.carriedOwnedWeapons = data.ownedWeapons ?? null
    this.carriedActiveWeapon = data.activeWeapon ?? null
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
      (Date.now() ^ (this.levelIndex * SEED_MIX.level) ^ (this.loop * SEED_MIX.loop)) >>> 0,
    )
    const match = createMatch(level, {
      levelIndex: this.levelIndex,
      loop: this.loop,
      rng,
      viewHeight: view,
      ...(this.carriedSession ? { session: this.carriedSession } : {}),
      ...(this.carriedOwnedWeapons ? { ownedWeapons: this.carriedOwnedWeapons } : {}),
      ...(this.carriedActiveWeapon ? { activeWeaponId: this.carriedActiveWeapon } : {}),
    })
    this.config = match.config
    this.state = match.state
    this.prev = this.state.player
    this.stepper = createStepper(FIXED_DT)

    // Static full-screen backdrop behind the world.
    this.cameras.main.setBackgroundColor(COLOR.cameraBackground)
    this.add
      .image(0, 0, bgKey(level.theme))
      .setOrigin(0, 0)
      .setDisplaySize(this.scale.width, view)
      .setScrollFactor(0)
      .setDepth(DEPTH.backdrop)

    // Geometry: small solids = wooden crate; everything else (ground + one-way
    // ledges) = the grassy ground tile, so floating platforms are clearly drawn.
    for (const s of this.config.solids) {
      if (s.x + s.w <= 0 || s.x >= level.worldWidth) continue // skip boundary walls
      if (!s.oneWay && s.w < CRATE_MAX_W) {
        this.add.image(s.x, s.y, TILE.crate).setOrigin(0, 0).setDisplaySize(s.w, s.h)
      } else {
        this.add.tileSprite(s.x, s.y, s.w, s.h, groundKey(level.theme)).setOrigin(0, 0)
      }
    }

    for (const l of this.config.ladders) {
      // Drawn a touch wider than the thin hitbox so the rungs read. The square
      // ladder texture is *tiled* vertically (not stretched) so the rung spacing
      // stays constant whatever the ladder's height — one tile per draw-width of
      // height, which keeps each rung square.
      const drawW = l.w + LADDER_DRAW_PAD
      this.add
        .tileSprite(l.x + l.w / 2, l.y, drawW, l.h, TILE.ladder)
        .setOrigin(0.5, 0)
        .setTileScale(drawW / LADDER_TILE_SIZE)
    }

    // Hazards (spikes/lava): painted with the theme's hazard tile; the damage
    // check itself lives in stepMatch.
    for (const h of this.config.hazards) {
      this.add.tileSprite(h.x, h.y, h.w, h.h, hazardKey(level.theme)).setOrigin(0, 0)
    }

    // (Re)build the dynamic render pools (knight, platforms, entity sprites).
    // scene.restart() destroys all GameObjects, so the renderer starts fresh.
    this.world = new WorldRenderer(this)
    this.world.reset(this.state, level.theme)

    // Camera scrolls within the world (horizontally and, for tower stages,
    // vertically), following the knight.
    this.cameras.main.setBounds(0, 0, level.worldWidth, worldHeight)
    this.cameras.main.startFollow(this.world.knight, true, CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_LERP)

    // Fixed on-screen help, pinned to the bottom so it never overlaps the Vue
    // HUD (lives/score/time) which sits along the top of the canvas.
    this.add
      .text(
        HELP_TEXT.x,
        view - HELP_TEXT.bottomMargin,
        `${level.name.toUpperCase()}   MOVE ←→  JUMP ↑  CROUCH ↓  THROW Z  SWAP X`,
        {
          fontFamily: UI_FONT,
          fontSize: HELP_TEXT.fontSize,
          color: COLOR.helpText,
          backgroundColor: COLOR.helpBackground,
          padding: HELP_TEXT.padding,
        },
      )
      .setScrollFactor(0)
      .setOrigin(0, 1)
      .setDepth(DEPTH.helpText)

    this.keys = createKeymap(this.input.keyboard!)

    // Pause/resume driven by the UI; cleaned up when the scene shuts down.
    bus.on('ui:pause', this.onPause)
    bus.on('ui:resume', this.onResume)
    startMusic() // idempotent; the master gain honours the mute toggle
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off('ui:pause', this.onPause)
      bus.off('ui:resume', this.onResume)
      stopMusic()
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

  update(time: number, delta: number): void {
    // Edge-detected weapon swap (presentation-only) — only while playing.
    if (this.state.phase === 'playing' && swapJustPressed(this.keys)) {
      this.state = {
        ...this.state,
        activeWeapon: nextOwnedWeapon(this.state.activeWeapon.id, this.state.ownedWeapons),
      }
      bus.emit('game:weapon-changed', { weapon: this.state.activeWeapon.id })
    }

    let alpha = 1
    if (this.state.phase === 'playing') {
      const input = readInput(this.keys)
      alpha = this.stepper.advance(delta / 1000, () => this.step(input))
    }
    this.world.render(this.state, this.prev, alpha, time, delta)
  }

  /** One fixed step: advance the pure use case, then present its effects. */
  private step(input: ReturnType<typeof readInput>): void {
    if (this.state.phase !== 'playing') return
    this.prev = this.state.player
    // Only enemies inside the camera's visible world region can be damaged — no
    // killing what you can't see (off-screen spawns / foes that left the frame).
    const v = this.cameras.main.worldView
    const view = aabb(v.x, v.y, v.width, v.height)
    const { state, effects } = stepMatch(this.config, this.state, input, FIXED_DT, view)
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
        case 'sound':
          playSfx(e.name)
          break
        case 'float':
          // The sparkle burst comes through as its own `vfx` effect; here we pop
          // the reward icon (a touch above the label) and the floating label.
          this.floatRewardIcon(e.x, e.y + REWARD_ICON.iconOffsetY, e.reward)
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
      .setDepth(DEPTH.rewardIcon)
      .setScale(REWARD_ICON.startScale)
    if (icon.tint !== undefined) spr.setTint(icon.tint)
    this.tweens.add({
      targets: spr,
      scale: REWARD_ICON.popScale,
      y: y - REWARD_ICON.popRiseY,
      duration: DURATION.rewardIconPop,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: spr,
          y: y - REWARD_ICON.fadeRiseY,
          alpha: 0,
          duration: DURATION.rewardIconFade,
          ease: 'Cubic.in',
          onComplete: () => spr.destroy(),
        })
      },
    })
  }

  /** A short-lived label that floats up and fades (chest pickups). */
  private floatReward(x: number, y: number, label: string, color: string): void {
    const t = this.add
      .text(x, y - FLOAT_LABEL.startOffsetY, label, {
        fontFamily: UI_FONT,
        fontSize: FLOAT_LABEL.fontSize,
        color,
        stroke: COLOR.textStroke,
        strokeThickness: FLOAT_LABEL.strokeThickness,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.floatLabel)
    this.tweens.add({
      targets: t,
      y: y - FLOAT_LABEL.riseY,
      scale: { from: FLOAT_LABEL.startScale, to: 1 },
      alpha: { from: 1, to: 0 },
      duration: DURATION.floatLabel,
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
        fontSize: BANNER.fontSize,
        color: COLOR.bannerText,
        stroke: COLOR.textStroke,
        strokeThickness: BANNER.strokeThickness,
        align: 'center',
        lineSpacing: BANNER.lineSpacing,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.banner)
    this.tweens.add({
      targets: banner,
      scale: { from: BANNER.startScale, to: 1 },
      duration: DURATION.banner,
      ease: 'Back.out',
    })
  }

  /**
   * Stage cleared (driven by the `cleared` phase from stepMatch): the campaign is
   * an endless loop, so clearing the final stage restarts at stage 1 on the next,
   * harder loop (no terminal win — a run ends only on game over). Clearing the
   * whole quest the first time still gets a celebratory VICTORY banner; later
   * loops announce the difficulty tier they ramp into. Session carried across.
   */
  private onWin(): void {
    const lastLevel = this.levelIndex >= LEVELS.length - 1
    const session = this.state.session
    // Carry the arsenal forward too — clearing a stage shouldn't strip the
    // weapons earned on it (only a fresh run resets to the starting kit).
    const ownedWeapons = this.state.ownedWeapons
    const activeWeapon = this.state.activeWeapon.id

    if (!lastLevel) {
      this.showBanner('STAGE CLEAR!')
      const next = {
        levelIndex: this.levelIndex + 1,
        loop: this.loop,
        session,
        ownedWeapons,
        activeWeapon,
      }
      this.time.delayedCall(STAGE_CLEAR_MS, () => this.scene.restart(next))
      return
    }

    // Final stage cleared → loop again, harder. Celebrate the first full clear,
    // otherwise announce the tier the next loop steps up to.
    const nextLoop = this.loop + 1
    const nextTier = difficultyForLoop(nextLoop).name
    const banner =
      this.loop === 1
        ? `VICTORY!\nTHE CURSE DEEPENS — ${nextTier}`
        : `${nextTier}!\nTHE LOOP TIGHTENS`
    this.showBanner(banner)
    const next = { levelIndex: 0, loop: nextLoop, session, ownedWeapons, activeWeapon }
    this.time.delayedCall(STAGE_CLEAR_MS, () => this.scene.restart(next))
  }
}
