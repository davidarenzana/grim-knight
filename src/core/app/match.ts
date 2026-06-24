import { aabb, type AABB } from '@core/math/aabb'
import type { Rng } from '@core/math/rng'
import { createPlayer, stepPlayer } from '@core/fsm/player'
import { stepEnemy, type Enemy } from '@core/enemies'
import {
  createWeapon,
  fire,
  advanceProjectilesDetailed,
  weaponById,
  DAGGER,
  STARTING_WEAPONS,
  type Projectile,
  type ProjectileCull,
} from '@core/weapons/weapon'
import { openChests, rollReward, createDrop, DROP_W, DROP_H, type Chest } from '@core/level/chest'
import { createSpawner, isFinished, stepSpawner } from '@core/level/spawner'
import { createTimer, tickTimer } from '@core/level/timer'
import { addScore, createSession, type Session } from '@core/rules/session'
import { difficultyForLoop } from '@core/rules/difficulty'
import { resolveCombat, resolveEnemyProjectiles, resolveMelee } from '@core/rules/combat'
import { hasFallenOut, hasSunkUnderFloor } from '@core/rules/fall'
import { touchesHazard } from '@core/rules/hazard'
import { platformSolid, stepPlatform } from '@core/physics/platform'
import { vec2 } from '@core/math/vector'
import { GROUND_Y } from '@core/level/geometry'
import type { LevelDef } from '@core/level/types'
import type { Effect, MatchConfig, MatchState, PlayerInput, StepResult } from './types'
import {
  SCORE_PER_KILL,
  CROUCH_H,
  MELEE_REACH,
  PLATFORM_RIDE_EPS,
  DROP_CHANCE,
  WORLD_WALL_THICKNESS,
  WORLD_WALL_PAD_TOP,
  WORLD_WALL_PAD_BOTTOM,
  DEATH_Y_PAD,
  SHAKE,
  VFX_SCALE,
  FLOAT_LABEL_OFFSET_Y,
  FLOAT_LABEL_STACK_Y,
} from './tuning'
import { notify } from './effects'
import { spawnEnemy } from './spawn'
import { applyReward } from './rewards'
import { handleDeath, bossNotifications } from './lifecycle'

/**
 * The application use case: advance one fixed simulation step for a single stage
 * run. Pure — it orchestrates the domain (`stepPlayer`, `stepEnemy`,
 * `resolveCombat`, …) and the app-layer helpers (`spawnEnemy`, `applyReward`,
 * `handleDeath`, `bossNotifications`), returning the next {@link MatchState} plus
 * the presentation {@link Effect}s to play, WITHOUT touching Phaser, the bus or
 * the DOM. The Phaser scene is a thin adapter that renders the state and
 * interprets the effects (camera shake, VFX, floating labels, HUD notifications).
 *
 * Scope: one stage. Terminal `phase`s (`gameover`/`cleared`) hand control back
 * to the adapter, which owns scene flow (respawn screen, banners, advancing the
 * campaign). Within-stage respawn (lives remain) is handled here as state.
 *
 * Purely-visual flourishes the adapter can derive by diffing rendered state
 * (enemy death bursts, hit-flash) intentionally stay in the render layer; only
 * logic-coupled effects are emitted here.
 */

export interface CreateMatchOptions {
  readonly levelIndex: number
  readonly loop: number
  /** Deterministic loot RNG (seeded by the adapter; injected so core stays pure). */
  readonly rng: Rng
  /** Viewport height, used as the default world height for flat (non-tower) stages. */
  readonly viewHeight: number
  /** Carried session across stage transitions (lives/score); fresh if omitted. */
  readonly session?: Session
  /** Weapons owned coming into the stage; defaults to the knight's starting kit. */
  readonly ownedWeapons?: readonly string[]
  /** Equipped weapon id coming into the stage; defaults to the dagger. */
  readonly activeWeaponId?: string
}

/**
 * Build the static config + initial state for a stage run from its `LevelDef`.
 * This is the pure half of what the Phaser scene's `create()` used to do
 * (geometry, spawner, rolled chest loot, timer); the adapter keeps only the
 * Phaser/render setup.
 */
export const createMatch = (
  level: LevelDef,
  opts: CreateMatchOptions,
): { config: MatchConfig; state: MatchState } => {
  const { levelIndex, loop, rng, viewHeight } = opts
  const worldHeight = level.worldHeight ?? viewHeight
  // Deeper loops are harder: less time on the clock (plus tougher enemies and a
  // richer payout, applied during the step). See core/rules/difficulty.
  const difficulty = difficultyForLoop(loop)
  const stageSeconds = Math.round(level.durationSeconds * difficulty.timeScale)
  const start = { x: level.playerStart.x, y: level.playerStart.y }
  const config: MatchConfig = {
    levelIndex,
    loop,
    difficulty,
    // Level geometry plus invisible world-boundary walls (left/right).
    solids: [
      ...level.solids,
      aabb(
        -WORLD_WALL_THICKNESS,
        -WORLD_WALL_PAD_TOP,
        WORLD_WALL_THICKNESS,
        worldHeight + WORLD_WALL_PAD_BOTTOM,
      ),
      aabb(
        level.worldWidth,
        -WORLD_WALL_PAD_TOP,
        WORLD_WALL_THICKNESS,
        worldHeight + WORLD_WALL_PAD_BOTTOM,
      ),
    ],
    ladders: level.ladders.map((l) => l),
    hazards: (level.hazards ?? []).map((h) => h),
    bounds: { minX: 0, maxX: level.worldWidth },
    deathY: worldHeight + DEATH_Y_PAD,
    // The "wedged below the floor" net is the ground line for flat stages, but
    // the world bottom for tall (tower) stages whose enemies stand high up.
    sinkY: level.worldHeight ? worldHeight : GROUND_Y,
    start,
    stageSeconds,
  }
  // Roll each random chest's reward fresh per run/stage so loot is unpredictable.
  const chests: Chest[] = (level.chests ?? []).map((c) =>
    c.random ? { ...c, reward: rollReward(rng) } : { ...c },
  )
  // The knight starts with the dagger + torch (plus armor); the axe (and the
  // curse's lance) are earned from chests/drops, so picking weapons up matters.
  // Across stage transitions the arsenal carries over (you keep what you found);
  // a fresh run falls back to the starting kit.
  const ownedWeapons = opts.ownedWeapons ?? STARTING_WEAPONS
  const activeWeapon = (opts.activeWeaponId && weaponById(opts.activeWeaponId)) || DAGGER
  const state: MatchState = {
    player: createPlayer(start.x, start.y),
    weapon: createWeapon(),
    activeWeapon,
    ownedWeapons,
    enemies: [],
    enemyProjectiles: [],
    chests,
    drops: [],
    spawner: createSpawner(level.spawns),
    timer: createTimer(stageSeconds),
    session: opts.session ?? createSession(),
    rng,
    platforms: (level.platforms ?? []).map((p) => p),
    phase: 'playing',
  }
  return { config, state }
}

/**
 * A `spark` VFX at the center of every projectile that was culled by hitting a
 * wall. Shared by the enemy- and player-projectile passes (both spark on a wall
 * hit, nowhere else).
 */
const sparkOnWallCull = (culled: readonly ProjectileCull[]): Effect[] =>
  culled
    .filter((c) => c.reason === 'wall')
    .map((c) => ({
      type: 'vfx',
      name: 'spark',
      x: c.projectile.pos.x + c.projectile.w / 2,
      y: c.projectile.pos.y + c.projectile.h / 2,
      scale: VFX_SCALE.sparkWall,
    }))

/**
 * Advance the match by one fixed step. Returns the next state and the effects
 * the adapter should present this tick. Faithful re-implementation of the old
 * `GameScene.tick()` orchestration, with effects as data.
 */
export const stepMatch = (
  config: MatchConfig,
  state: MatchState,
  input: PlayerInput,
  dt: number,
  /** Visible world region; the player can only damage enemies overlapping it. */
  view?: AABB,
): StepResult => {
  if (state.phase !== 'playing') return { state, effects: [] }
  const effects: Effect[] = []

  // 1. Stage countdown: notify on each whole-second change; time-out kills.
  const t = tickTimer(state.timer, dt)
  const timer = t.timer
  if (Math.ceil(state.timer.secondsLeft) !== Math.ceil(timer.secondsLeft)) {
    effects.push(notify({ kind: 'time', secondsLeft: timer.secondsLeft }))
  }
  if (t.expired) {
    const dead = handleDeath(config, { ...state, timer })
    return { state: dead.state, effects: [...effects, ...dead.effects] }
  }

  // 2. Wake enemies the player has walked up to, then step + cull them.
  const px = state.player.body.pos.x
  const py = state.player.body.pos.y
  const spawn = stepSpawner(state.spawner, px, py)
  const spawner = spawn.spawner
  let enemies: Enemy[] = [
    ...state.enemies,
    ...spawn.due.map((ev) => spawnEnemy(ev.kind, ev.x, ev.y, config.levelIndex, config.difficulty)),
  ]
  const b0 = state.player.body
  const target = { x: b0.pos.x + b0.w / 2, y: b0.pos.y + b0.h / 2 }
  const stepped = enemies.map((e) => stepEnemy(e, target, config.solids, dt, config.ladders))
  // Cull (mark dead) any enemy fallen out of the world, or — soft-lock safety
  // net — a ground enemy wedged below the floor (flyers hover low legitimately).
  enemies = stepped.map((r) => {
    const e = r.enemy
    if (e.state === 'dead') return e
    const gone =
      hasFallenOut(e.body, config.deathY) ||
      (e.kind !== 'flyer' && hasSunkUnderFloor(e.body, config.sinkY))
    return gone ? { ...e, state: 'dead' as const, hp: 0 } : e
  })
  let enemyProjectiles: Projectile[] = [...state.enemyProjectiles]
  for (const r of stepped) if (r.fired.length) enemyProjectiles.push(...r.fired)
  const eadv = advanceProjectilesDetailed(enemyProjectiles, dt, config.bounds, config.solids)
  enemyProjectiles = eadv.alive
  effects.push(...sparkOnWallCull(eadv.culled))

  // 3. Throw (+ point-blank jab for arcing weapons).
  let weapon = state.weapon
  let meleeBox = null as ReturnType<typeof aabb> | null
  if (input.attack) {
    const pb = state.player.body
    const w = state.activeWeapon
    const originX = state.player.facing > 0 ? pb.pos.x + pb.w : pb.pos.x - w.w
    const originY = pb.pos.y + pb.h / 2
    const fireCount = weapon.projectiles.length
    weapon = fire(weapon, w, originX, originY, state.player.facing)
    if (weapon.projectiles.length > fireCount) {
      effects.push({ type: 'sound', name: 'throw' })
      meleeBox =
        state.player.facing > 0
          ? aabb(pb.pos.x + pb.w, pb.pos.y, MELEE_REACH, pb.h)
          : aabb(pb.pos.x - MELEE_REACH, pb.pos.y, MELEE_REACH, pb.h)
    }
  }
  const wadv = advanceProjectilesDetailed(weapon.projectiles, dt, config.bounds, config.solids)
  weapon = { cooldownLeft: Math.max(0, weapon.cooldownLeft - dt), projectiles: wadv.alive }
  effects.push(...sparkOnWallCull(wadv.culled))

  // 4. Player projectiles + jab vs enemies.
  const b = state.player.body
  const ph = state.player.state === 'crouch' ? CROUCH_H : b.h
  const playerBox = aabb(b.pos.x, b.pos.y + (b.h - ph), b.w, ph)
  const before = enemies
  const combat = resolveCombat(playerBox, weapon.projectiles, enemies, view)
  weapon = { ...weapon, projectiles: combat.projectiles }
  let enemiesAfter = combat.enemies as Enemy[]
  let kills = combat.kills
  if (meleeBox) {
    const melee = resolveMelee(meleeBox, enemiesAfter, view)
    enemiesAfter = melee.enemies as Enemy[]
    kills += melee.kills
  }
  enemies = enemiesAfter

  // Spark on a surviving hit; a kill may drop an item (the death burst itself is
  // a render-side flourish derived from the dead state).
  let drops: Chest[] = [...state.drops]
  const rng = state.rng
  enemies.forEach((e, i) => {
    const prev = before[i]
    if (prev && e.hp < prev.hp) {
      if (e.state !== 'dead') {
        effects.push({
          type: 'vfx',
          name: 'spark',
          x: e.body.pos.x + e.body.w / 2,
          y: e.body.pos.y + e.body.h / 2,
          scale: VFX_SCALE.sparkHit,
        })
        effects.push({ type: 'sound', name: 'hit' })
      } else {
        effects.push({ type: 'sound', name: 'kill' })
        if (e.kind === 'boss' || rng.next() < DROP_CHANCE) {
          const reward = rollReward(rng, false)
          drops = [
            ...drops,
            createDrop(
              e.body.pos.x + e.body.w / 2 - DROP_W / 2,
              e.body.pos.y + e.body.h / 2 - DROP_H / 2,
              reward,
            ),
          ]
        }
      }
    }
  })

  effects.push(...bossNotifications(before, enemies))

  let session = state.session
  if (kills > 0) {
    // Deeper loops pay more (arcade risk/reward).
    session = addScore(session, Math.round(kills * SCORE_PER_KILL * config.difficulty.scoreMul))
    effects.push(notify({ kind: 'score', score: session.score }))
    effects.push({ type: 'shake', ...SHAKE.kill }) // a small kick per kill
  }

  // Jump cue: the FSM jumps when grounded + jump pressed and not crouching.
  if (input.jump && state.player.body.grounded && state.player.state !== 'crouch') {
    effects.push({ type: 'sound', name: 'jump' })
  }

  // 5. Moving platforms: advance them, then carry the knight if he's riding one.
  // Riding is decided from the platform's PREVIOUS position (where he rests now);
  // the knight is shifted by that platform's per-step delta before his own
  // physics step, against the moved platforms as one-way solids (player only —
  // enemies/projectiles keep to static geometry).
  const platforms = state.platforms.map((p) => stepPlatform(p, dt))
  let riderPlayer = state.player
  if (state.platforms.length) {
    const pb = state.player.body
    const feet = pb.pos.y + pb.h
    for (let i = 0; i < state.platforms.length; i++) {
      const was = state.platforms[i]!
      const onTop =
        pb.grounded &&
        Math.abs(feet - was.pos.y) <= PLATFORM_RIDE_EPS &&
        pb.pos.x + pb.w > was.pos.x &&
        pb.pos.x < was.pos.x + was.w
      if (!onTop) continue
      const now = platforms[i]!
      riderPlayer = {
        ...state.player,
        body: {
          ...pb,
          pos: vec2(pb.pos.x + (now.pos.x - was.pos.x), pb.pos.y + (now.pos.y - was.pos.y)),
        },
      }
      break
    }
  }
  const playerSolids = platforms.length
    ? [...config.solids, ...platforms.map(platformSolid)]
    : config.solids

  // 6. Enemy projectiles + hazards vs the player → step the FSM.
  const ep = resolveEnemyProjectiles(playerBox, enemyProjectiles)
  enemyProjectiles = [...ep.projectiles]
  const damaged = combat.playerHit || ep.playerHit || touchesHazard(playerBox, config.hazards)
  const prevIFrames = state.player.armor.iFramesLeft
  let player = stepPlayer(
    riderPlayer,
    input,
    { solids: playerSolids, ladders: config.ladders, damaged },
    dt,
  )
  // Fresh non-fatal hit: i-frames just opened and the knight survived → spark.
  if (prevIFrames === 0 && player.armor.iFramesLeft > 0 && player.armor.state !== 'dead') {
    const hb = player.body
    effects.push({
      type: 'vfx',
      name: 'spark',
      x: hb.pos.x + hb.w / 2,
      y: hb.pos.y + hb.h / 2,
      scale: VFX_SCALE.sparkPlayerHit,
    })
    effects.push({ type: 'sound', name: 'hurt' })
  }

  let next: MatchState = {
    ...state,
    timer,
    spawner,
    enemies,
    enemyProjectiles,
    weapon,
    drops,
    rng,
    session,
    player,
    platforms,
    activeWeapon: state.activeWeapon,
  }

  // Fell into a pit: a drop below the world bottom costs a life.
  if (hasFallenOut(player.body, config.deathY)) {
    const dead = handleDeath(config, next)
    return { state: dead.state, effects: [...effects, ...dead.effects] }
  }

  // 7. Collect chests / drops the knight is touching.
  const pickBox = aabb(player.body.pos.x, player.body.pos.y, player.body.w, player.body.h)
  for (const which of ['chests', 'drops'] as const) {
    const list = next[which]
    if (list.length === 0) continue
    const opened = openChests(pickBox, list)
    if (opened.rewards.length === 0) continue
    const newList = opened.chests as Chest[]
    const popped = newList.filter((c, i) => c.opened && !list[i]!.opened)
    opened.rewards.forEach((reward, n) => {
      const r = applyReward({ ...next, player, session, activeWeapon: next.activeWeapon }, reward)
      player = r.player
      session = r.session
      next = { ...next, activeWeapon: r.activeWeapon, ownedWeapons: r.ownedWeapons }
      effects.push(...r.effects)
      const src = popped[n]
      const cx = src ? src.x + src.w / 2 : player.body.pos.x + player.body.w / 2
      const top = src ? src.y : player.body.pos.y
      const mid = src ? src.y + src.h / 2 : player.body.pos.y + player.body.h / 2
      effects.push({ type: 'vfx', name: 'magic_ring', x: cx, y: mid, scale: VFX_SCALE.magicRing })
      effects.push({ type: 'sound', name: 'pickup' })
      effects.push({
        type: 'float',
        label: r.label,
        color: r.color,
        reward,
        x: cx,
        y: top - FLOAT_LABEL_OFFSET_Y - n * FLOAT_LABEL_STACK_Y,
      })
    })
    next = { ...next, [which]: newList }
  }

  // 8. Armor change feedback.
  if (player.armor.state !== state.player.armor.state) {
    effects.push(notify({ kind: 'armor', armor: player.armor.state }))
    effects.push({ type: 'shake', ...SHAKE.armor })
  }

  next = { ...next, player, session }

  // 9. Death by the last hit → lose a life / game-over.
  if (player.armor.state === 'dead') {
    const dead = handleDeath(config, next)
    return { state: dead.state, effects: [...effects, ...dead.effects] }
  }

  // 10. Stage cleared: spawner done and every spawned enemy dead.
  if (isFinished(spawner) && enemies.length > 0 && enemies.every((e) => e.state === 'dead')) {
    return {
      state: { ...next, phase: 'cleared' },
      effects: [...effects, { type: 'sound', name: 'stage-clear' }],
    }
  }

  return { state: next, effects }
}
