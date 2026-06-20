import Phaser from 'phaser'
import { aabb, type AABB } from '@core/math/aabb'
import type { Solid } from '@core/physics/body'
import { lerp } from '@core/math/vector'
import { createRng, type Rng } from '@core/math/rng'
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
  advanceProjectilesDetailed,
  nextWeapon,
  weaponById,
  LANCE,
  DAGGER,
  type WeaponDef,
  type WeaponState,
  type Projectile,
  type ProjectileCull,
} from '@core/weapons/weapon'
import {
  createZombie,
  createFlyer,
  createOgre,
  createPlant,
  createBoss,
  createCentipede,
  createTurtle,
  createBloated,
  BOSS_VARIANTS,
  stepEnemy,
  type Enemy,
  type EnemyKind,
  type BossVariant,
} from '@core/enemies'
import { createSpawner, isFinished, stepSpawner, type Spawner } from '@core/level/spawner'
import { createTimer, tickTimer, type StageTimer } from '@core/level/timer'
import { LEVELS } from '@core/level/level'
import { GROUND_Y } from '@core/level/geometry'
import {
  openChests,
  rollReward,
  createDrop,
  DROP_W,
  DROP_H,
  type Chest,
  type ChestReward,
} from '@core/level/chest'
import { resolveCombat, resolveEnemyProjectiles, resolveMelee } from '@core/rules/combat'
import { hasFallenOut, hasSunkUnderFloor } from '@core/rules/fall'
import { touchesHazard } from '@core/rules/hazard'
import { addScore, createSession, gainLife, loseLife, win, type Session } from '@core/rules/session'
import { pickupArmor, type ArmorState } from '@core/rules/armor'
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

/** Map a core enemy state to a sprite animation state (idle/walk/dead). */
const enemyAnim = (state: string): string =>
  state === 'dead' ? 'dead' : state === 'walking' ? 'walk' : 'idle'

const FIXED_DT = 1 / 60
const SCORE_PER_KILL = 100
const CROUCH_H = Math.round(PLAYER_H * 0.6) // shorter profile while crouching (dodge high shots)
const HIT_FLASH = 0.1 // seconds an enemy flashes white after taking a hit
const STAGE_CLEAR_MS = 1700 // banner hold before advancing to the next stage
const MELEE_REACH = 26 // px in front of the knight that a throw also jabs (point-blank)
const DROP_CHANCE = 0.18 // chance a slain regular enemy drops an item (a boss always does)

/** Format a 0xRRGGBB number as a CSS hex string for Phaser text colors. */
const hexColor = (n: number): string => `#${n.toString(16).padStart(6, '0')}`

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
  private player!: Player
  private prev!: Player
  private weapon!: WeaponState
  private activeWeapon: WeaponDef = DAGGER
  private enemies: Enemy[] = []
  private enemyFlash: number[] = [] // per-enemy hit-flash timer (juice)
  private enemyExploded: boolean[] = [] // per-enemy: death burst already played
  private enemyProjectiles: Projectile[] = []
  private chests: Chest[] = []
  private drops: Chest[] = [] // items dropped by slain enemies (collected like chests)
  private lootRng!: Rng // per-run RNG for chest rolls + enemy drops
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
  private hazards: AABB[] = []
  private bounds!: { minX: number; maxX: number }
  private deathY = 0 // y below which a fallen player dies (set per scene size)

  // Level state (carried across stage transitions via scene.restart).
  private levelIndex = 0
  private loop = 1
  private carriedSession: Session | null = null
  private start = { x: 80, y: 362 }
  private stageSeconds = 99

  private knight!: Phaser.GameObjects.Sprite
  private projSprites: Phaser.GameObjects.Sprite[] = []
  private projRects: Phaser.GameObjects.Rectangle[] = [] // fallback when a weapon has no art
  private enemyProjRects: Phaser.GameObjects.Rectangle[] = []
  private enemyProjSprites: Phaser.GameObjects.Sprite[] = []
  private enemySprites: Phaser.GameObjects.Sprite[] = []
  private chestSprites: Phaser.GameObjects.Image[] = []
  private dropSprites: Phaser.GameObjects.Image[] = []
  private meleeBox: AABB | null = null // point-blank jab box for the current tick
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
    preloadWeapons(this)
    preloadTiles(this)
    preloadEffects(this)
    preloadIcons(this)
    preloadEnemyProjectiles(this)
  }

  create(): void {
    const height = this.scale.height
    createAnims(this)
    createWeaponAnims(this)
    createEffectAnims(this)
    createEnemyProjectileAnims(this)
    const level = LEVELS[this.levelIndex] ?? LEVELS[0]!
    this.start = { ...level.playerStart }
    // Loop 2 (the classic "second quest") is harder: less time on the clock.
    const timeScale = this.loop >= 2 ? 0.75 : 1
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
      .image(0, 0, bgKey(level.theme))
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
        this.add.tileSprite(s.x, s.y, s.w, s.h, groundKey(level.theme)).setOrigin(0, 0)
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

    // Hazards (spikes/lava): painted with the theme's hazard tile and folded
    // into the player's damage check each tick.
    this.hazards = (level.hazards ?? []).map((h) => h)
    for (const h of this.hazards) {
      this.add.tileSprite(h.x, h.y, h.w, h.h, hazardKey(level.theme)).setOrigin(0, 0)
    }

    this.bounds = { minX: 0, maxX: level.worldWidth }
    this.deathY = height + 40 // just below the viewport: fall past it = death
    this.stepper = createStepper(FIXED_DT)
    this.player = createPlayer(this.start.x, this.start.y)
    this.prev = this.player
    this.weapon = createWeapon()
    // The knight starts with the dagger (plus armor); other weapons come from loot.
    this.activeWeapon = DAGGER
    this.session = this.carriedSession ?? createSession()
    this.over = false
    this.lastArmor = 'armored'
    this.enemies = []
    this.enemyFlash = []
    this.enemyExploded = []
    this.enemyProjectiles = []
    // Roll each random chest's reward fresh per run/stage so loot is unpredictable.
    // Seed off the wall clock (engine-side, allowed) mixed with stage/loop so two
    // chests on the same screen don't share a roll.
    this.lootRng = createRng(
      (Date.now() ^ (this.levelIndex * 0x9e3779b1) ^ (this.loop * 0x85ebca6b)) >>> 0,
    )
    this.chests = (level.chests ?? []).map((c) =>
      c.random ? { ...c, reward: rollReward(this.lootRng) } : { ...c },
    )
    this.drops = []
    // Reset render pools: scene.restart() destroys all GameObjects, so the old
    // pooled sprites are dead — start fresh or we'd touch destroyed objects.
    this.projSprites = []
    this.projRects = []
    this.enemyProjRects = []
    this.enemyProjSprites = []
    this.enemySprites = []
    this.chestSprites = []
    this.dropSprites = []
    this.timer = createTimer(this.stageSeconds)
    this.lastSecond = -1
    this.lastBossHp = -1
    this.bossCleared = false
    this.spawner = createSpawner(level.spawns)

    this.knight = this.add.sprite(this.player.body.pos.x, this.player.body.pos.y, 'knight-idle')

    // Camera scrolls within the world, following the knight.
    this.cameras.main.setBounds(0, 0, level.worldWidth, height)
    this.cameras.main.startFollow(this.knight, true, 0.12, 0.12)

    // Fixed on-screen help, pinned to the bottom so it never overlaps the Vue
    // HUD (lives/score/time) which sits along the top of the canvas.
    this.add
      .text(
        10,
        height - 8,
        `${level.name.toUpperCase()}   MOVE A/D  JUMP W  CROUCH S  THROW SPACE  SWAP Q`,
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
    this.renderDrops()
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

    // Wake enemies the player has walked up to, then steer them toward it.
    const spawn = stepSpawner(this.spawner, this.player.body.pos.x)
    this.spawner = spawn.spawner
    for (const ev of spawn.due) this.enemies.push(this.spawnEnemy(ev.kind, ev.x, ev.y))

    const b0 = this.player.body
    const target = { x: b0.pos.x + b0.w / 2, y: b0.pos.y + b0.h / 2 }
    const stepped = this.enemies.map((e) => stepEnemy(e, target, this.solids, FIXED_DT))
    // Cull (mark dead) any living enemy that fell out of the world, or — safety
    // net against a soft-lock — a ground enemy wedged below the floor surface
    // where the player can't reach it (flyers legitimately hover low, so exempt).
    this.enemies = stepped.map((r) => {
      const e = r.enemy
      if (e.state === 'dead') return e
      const gone =
        hasFallenOut(e.body, this.deathY) ||
        (e.kind !== 'flyer' && hasSunkUnderFloor(e.body, GROUND_Y))
      return gone ? { ...e, state: 'dead' as const, hp: 0 } : e
    })
    for (const r of stepped) if (r.fired.length) this.enemyProjectiles.push(...r.fired)
    const eadv = advanceProjectilesDetailed(
      this.enemyProjectiles,
      FIXED_DT,
      this.bounds,
      this.solids,
    )
    this.enemyProjectiles = eadv.alive
    this.sparkWallHits(eadv.culled)

    this.meleeBox = null
    if (input.attack) {
      const pb = this.player.body
      const w = this.activeWeapon
      const originX = this.player.facing > 0 ? pb.pos.x + pb.w : pb.pos.x - w.w
      const originY = pb.pos.y + pb.h / 2
      const fireCount = this.weapon.projectiles.length
      this.weapon = fire(this.weapon, w, originX, originY, this.player.facing)
      // A throw that actually fires also lands a point-blank jab in front of the
      // knight, so arcing weapons (which fly over a foe right next to you) connect.
      if (this.weapon.projectiles.length > fireCount) {
        this.meleeBox =
          this.player.facing > 0
            ? aabb(pb.pos.x + pb.w, pb.pos.y, MELEE_REACH, pb.h)
            : aabb(pb.pos.x - MELEE_REACH, pb.pos.y, MELEE_REACH, pb.h)
      }
    }
    const wadv = advanceProjectilesDetailed(
      this.weapon.projectiles,
      FIXED_DT,
      this.bounds,
      this.solids,
    )
    this.weapon = {
      cooldownLeft: Math.max(0, this.weapon.cooldownLeft - FIXED_DT),
      projectiles: wadv.alive,
    }
    this.sparkWallHits(wadv.culled)

    // Crouching shrinks the player's hitbox (feet planted) so it can duck shots.
    const b = this.player.body
    const ph = this.player.state === 'crouch' ? CROUCH_H : b.h
    const playerBox = aabb(b.pos.x, b.pos.y + (b.h - ph), b.w, ph)
    const before = this.enemies
    const result = resolveCombat(playerBox, this.weapon.projectiles, this.enemies)
    this.weapon = { ...this.weapon, projectiles: result.projectiles }
    let enemiesAfter = result.enemies as Enemy[]
    let kills = result.kills
    // Apply the point-blank jab (if any) on the post-projectile enemy state.
    if (this.meleeBox) {
      const melee = resolveMelee(this.meleeBox, enemiesAfter)
      enemiesAfter = melee.enemies as Enemy[]
      kills += melee.kills
    }
    this.enemies = enemiesAfter
    // Juice: flash an enemy white the moment its HP drops (index order is stable).
    this.enemyFlash = this.enemyFlash.map((t) => Math.max(0, t - FIXED_DT))
    this.enemies.forEach((e, i) => {
      const prev = before[i]
      if (prev && e.hp < prev.hp) {
        this.enemyFlash[i] = HIT_FLASH
        if (e.state !== 'dead') {
          // Spark on a surviving hit; a kill instead gets the death explosion.
          playEffect(this, 'spark', e.body.pos.x + e.body.w / 2, e.body.pos.y + e.body.h / 2, 0.14)
        } else {
          // Killed by this hit: maybe drop an item the player can pick up.
          this.maybeDropItem(e)
        }
      }
    })
    this.emitBossHp()

    if (kills > 0) {
      this.session = addScore(this.session, kills * SCORE_PER_KILL)
      bus.emit('game:score-changed', { score: this.session.score })
      this.cameras.main.shake(90, 0.006) // a small kick on each kill
    }

    // Enemy projectiles vs the player.
    const ep = resolveEnemyProjectiles(playerBox, this.enemyProjectiles)
    this.enemyProjectiles = [...ep.projectiles]
    const damaged = result.playerHit || ep.playerHit || touchesHazard(playerBox, this.hazards)

    const prevIFrames = this.player.armor.iFramesLeft
    this.player = stepPlayer(
      this.player,
      input,
      { solids: this.solids, ladders: this.ladders, damaged },
      FIXED_DT,
    )
    // Fresh non-fatal hit: i-frames just opened and the knight survived → spark.
    if (
      prevIFrames === 0 &&
      this.player.armor.iFramesLeft > 0 &&
      this.player.armor.state !== 'dead'
    ) {
      const hb = this.player.body
      playEffect(this, 'spark', hb.pos.x + hb.w / 2, hb.pos.y + hb.h / 2, 0.18)
    }

    // Fell into a pit: drop below the world bottom costs a life (classic rule).
    if (hasFallenOut(this.player.body, this.deathY)) {
      this.onPlayerDead()
      return
    }

    // Collect any chest or enemy-dropped item the knight is touching.
    const pb = this.player.body
    const pickBox = aabb(pb.pos.x, pb.pos.y, pb.w, pb.h)
    if (this.chests.length > 0) {
      const prev = this.chests
      const opened = openChests(pickBox, this.chests)
      if (opened.rewards.length > 0) {
        this.chests = opened.chests as Chest[]
        const popped = this.chests.filter((c, i) => c.opened && !prev[i]!.opened)
        opened.rewards.forEach((reward, n) => this.collectReward(reward, popped[n], pb, n))
      }
    }
    if (this.drops.length > 0) {
      const prev = this.drops
      const got = openChests(pickBox, this.drops)
      if (got.rewards.length > 0) {
        this.drops = got.chests as Chest[]
        const popped = this.drops.filter((c, i) => c.opened && !prev[i]!.opened)
        got.rewards.forEach((reward, n) => this.collectReward(reward, popped[n], pb, n))
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
   * Apply a collected reward (from a chest or a drop) and play its feedback: a
   * magic-ring burst, the item icon popping out, and the floating label.
   * `source` is the chest/drop box for positioning (falls back to the player).
   */
  private collectReward(
    reward: ChestReward,
    source: Chest | undefined,
    pb: Player['body'],
    n: number,
  ): void {
    const fb = this.applyChestReward(reward)
    const cx = source ? source.x + source.w / 2 : pb.pos.x + pb.w / 2
    const top = source ? source.y : pb.pos.y
    const mid = source ? source.y + source.h / 2 : pb.pos.y + pb.h / 2
    playEffect(this, 'magic_ring', cx, mid, 1.1) // a burst of sparkles
    this.floatRewardIcon(cx, top - 6, reward) // the item icon pops out
    this.floatReward(cx, top - 30 - n * 18, fb.label, fb.color)
  }

  /**
   * On a kill, maybe drop a pickup at the enemy: bosses always drop, regular
   * enemies do so with {@link DROP_CHANCE}. Enemy drops never roll a curse.
   */
  private maybeDropItem(e: Enemy): void {
    if (e.kind !== 'boss' && this.lootRng.next() >= DROP_CHANCE) return
    const reward = rollReward(this.lootRng, false)
    const cx = e.body.pos.x + e.body.w / 2
    const cy = e.body.pos.y + e.body.h / 2
    this.drops.push(createDrop(cx - DROP_W / 2, cy - DROP_H / 2, reward))
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

  /** Emit the boss HP to the HUD (bar) and a one-time cleared event when it dies. */
  private emitBossHp(): void {
    const boss = this.enemies.find((e) => e.kind === 'boss')
    if (!boss) return
    if (boss.state !== 'dead') {
      if (boss.hp !== this.lastBossHp) {
        this.lastBossHp = boss.hp
        bus.emit('game:boss-hp', { hp: boss.hp, maxHp: BOSS_VARIANTS[boss.variant ?? 1].hp })
      }
    } else if (!this.bossCleared) {
      this.bossCleared = true
      bus.emit('game:boss-cleared')
    }
  }

  /** Boss skin/stats escalate one variant per pair of stages (1,1,2,2,3,3). */
  private bossVariant(): BossVariant {
    return (Math.min(2, Math.floor(this.levelIndex / 2)) + 1) as BossVariant
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
        return createBoss(x, y, this.bossVariant())
      case 'centipede':
        return createCentipede(x, y)
      case 'turtle':
        return createTurtle(x, y)
      case 'bloated':
        return createBloated(x, y)
    }
  }

  private onPlayerDead(): void {
    const pb = this.player.body
    playEffect(this, 'explosion', pb.pos.x + pb.w / 2, pb.pos.y + pb.h / 2, 0.42) // death burst
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

  /**
   * Sync the player projectile pool. Uses the active weapon's animated sprite
   * (spear/dagger/torch/axe) centered on each projectile and flipped by travel
   * direction; falls back to a colored rectangle if a weapon has no art.
   */
  private renderProjectiles(): void {
    const projectiles = this.weapon.projectiles
    const id = this.activeWeapon.id

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
    const ps = this.enemyProjectiles
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

  /** Pop a small spark where each wall-culled projectile struck (ignore bounds/range). */
  private sparkWallHits(culls: readonly ProjectileCull[]): void {
    for (const c of culls) {
      if (c.reason !== 'wall') continue
      const p = c.projectile
      playEffect(this, 'spark', p.pos.x + p.w / 2, p.pos.y + p.h / 2, 0.1)
    }
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

  /** Sync the enemy-drop pool: each uncollected drop shows its reward icon, bobbing. */
  private renderDrops(): void {
    while (this.dropSprites.length < this.drops.length) {
      this.dropSprites.push(this.add.image(0, 0, ICON.heart).setOrigin(0.5, 0.5).setDepth(60))
    }
    const t = this.time.now
    this.dropSprites.forEach((spr, i) => {
      const d = this.drops[i]
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
