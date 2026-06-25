import Phaser from 'phaser'
import { aabb } from '@core/math/aabb'
import { createRng } from '@core/math/rng'
import { createStepper, type Stepper } from '@core/sim/loop'
import { type Player } from '@core/fsm/player'
import { nextOwnedWeapon } from '@core/weapons/weapon'
import { LEVELS } from '@core/level/level'
import { type Session } from '@core/rules/session'
import { difficultyForLoop } from '@core/rules/difficulty'
import {
  createMatch,
  stepMatch,
  FIXED_DT,
  type MatchConfig,
  type MatchState,
  type Effect,
} from '@core/app'
import {
  preloadSprites,
  createAnims,
  preloadWeapons,
  createWeaponAnims,
  preloadEnemyProjectiles,
  createEnemyProjectileAnims,
} from '@engine/assets/sprites'
import { preloadTiles } from '@engine/assets/tiles'
import { preloadEffects, createEffectAnims, preloadIcons, playEffect } from '@engine/assets/effects'
import { bus } from '@shared/events'
import { playSfx, startMusic, stopMusic } from '@engine/audio'
import { createKeymap, readInput, swapJustPressed, type Keymap } from '@engine/input/keymap'
import { WorldRenderer } from '@engine/render/WorldRenderer'
import { paintScenery } from '@engine/render/scenery'
import { floatReward, floatRewardIcon, showBanner } from '@engine/render/overlays'
import { emitInitialHud, emitNotification } from '@engine/hudBridge'
import { CAMERA_FOLLOW_LERP, REWARD_ICON, STAGE_CLEAR_MS, SEED_MIX } from '@engine/render/theme'

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

    // Static scenery (backdrop, geometry, ladders, hazards, help text). Painted
    // before the dynamic pools so it sits behind the moving sprites.
    paintScenery(this, this.config, level, view)

    // (Re)build the dynamic render pools (knight, platforms, entity sprites).
    // scene.restart() destroys all GameObjects, so the renderer starts fresh.
    this.world = new WorldRenderer(this)
    this.world.reset(this.state, level.theme)

    // Camera scrolls within the world (horizontally and, for tower stages,
    // vertically), following the knight.
    this.cameras.main.setBounds(0, 0, level.worldWidth, worldHeight)
    this.cameras.main.startFollow(this.world.knight, true, CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_LERP)

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
    emitInitialHud(this.state, this.levelIndex, this.loop)
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
          floatRewardIcon(this, e.x, e.y + REWARD_ICON.iconOffsetY, e.reward)
          floatReward(this, e.x, e.y, e.label, e.color)
          break
        case 'notify':
          emitNotification(e.notification)
          break
      }
    }
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
      showBanner(this, 'STAGE CLEAR!')
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
    showBanner(this, banner)
    const next = { levelIndex: 0, loop: nextLoop, session, ownedWeapons, activeWeapon }
    this.time.delayedCall(STAGE_CLEAR_MS, () => this.scene.restart(next))
  }
}
