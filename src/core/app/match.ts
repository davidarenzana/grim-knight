import { aabb, type AABB } from '@core/math/aabb'
import type { Rng } from '@core/math/rng'
import { createPlayer, stepPlayer, PLAYER_H, type Player } from '@core/fsm/player'
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
import {
  createWeapon,
  fire,
  advanceProjectilesDetailed,
  weaponById,
  DAGGER,
  TORCH,
  LANCE,
  type Projectile,
  type WeaponDef,
} from '@core/weapons/weapon'
import {
  openChests,
  rollReward,
  createDrop,
  DROP_W,
  DROP_H,
  type Chest,
  type ChestReward,
} from '@core/level/chest'
import { createSpawner, isFinished, stepSpawner } from '@core/level/spawner'
import { createTimer, tickTimer } from '@core/level/timer'
import { addScore, createSession, gainLife, loseLife, type Session } from '@core/rules/session'
import { pickupArmor } from '@core/rules/armor'
import { resolveCombat, resolveEnemyProjectiles, resolveMelee } from '@core/rules/combat'
import { hasFallenOut, hasSunkUnderFloor } from '@core/rules/fall'
import { touchesHazard } from '@core/rules/hazard'
import { GROUND_Y } from '@core/level/geometry'
import type { LevelDef } from '@core/level/types'
import type {
  Effect,
  GameNotification,
  MatchConfig,
  MatchState,
  PlayerInput,
  StepResult,
} from './types'

/**
 * The application use case: advance one fixed simulation step for a single stage
 * run. Pure — it orchestrates the domain (`stepPlayer`, `stepEnemy`,
 * `resolveCombat`, …) and returns the next {@link MatchState} plus the
 * presentation {@link Effect}s to play, WITHOUT touching Phaser, the bus or the
 * DOM. The Phaser scene is a thin adapter that renders the state and interprets
 * the effects (camera shake, VFX, floating labels, HUD notifications).
 *
 * Scope: one stage. Terminal `phase`s (`gameover`/`cleared`) hand control back
 * to the adapter, which owns scene flow (respawn screen, banners, advancing the
 * campaign). Within-stage respawn (lives remain) is handled here as state.
 *
 * Purely-visual flourishes the adapter can derive by diffing rendered state
 * (enemy death bursts, hit-flash) intentionally stay in the render layer; only
 * logic-coupled effects are emitted here.
 */

// --- Gameplay tunables (pixels / seconds) ---------------------------------
export const FIXED_DT = 1 / 60
export const SCORE_PER_KILL = 100
/** Shorter profile while crouching (dodge high shots). */
export const CROUCH_H = Math.round(PLAYER_H * 0.6)
/** Px in front of the knight that a throw also jabs (point-blank). */
export const MELEE_REACH = 26
/** Chance a slain regular enemy drops an item (a boss always does). */
export const DROP_CHANCE = 0.18

/** Reward-label color per weapon id (presentation data for the float effect). */
const WEAPON_COLOR: Record<string, number> = {
  lance: 0xffcc00,
  dagger: 0xc0c0c0,
  torch: 0xff7a1a,
  axe: 0x66ccff,
}
const hexColor = (n: number): string => `#${n.toString(16).padStart(6, '0')}`

const notify = (notification: GameNotification): Effect => ({ type: 'notify', notification })

/** Boss skin/stats escalate one variant per pair of stages (1,1,2,2,3,3). */
const bossVariant = (levelIndex: number): BossVariant =>
  (Math.min(2, Math.floor(levelIndex / 2)) + 1) as BossVariant

const spawnEnemy = (kind: EnemyKind, x: number, y: number, levelIndex: number): Enemy => {
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
      return createBoss(x, y, bossVariant(levelIndex))
    case 'centipede':
      return createCentipede(x, y)
    case 'turtle':
      return createTurtle(x, y)
    case 'bloated':
      return createBloated(x, y)
  }
}

export interface CreateMatchOptions {
  readonly levelIndex: number
  readonly loop: number
  /** Deterministic loot RNG (seeded by the adapter; injected so core stays pure). */
  readonly rng: Rng
  /** Viewport height, used as the default world height for flat (non-tower) stages. */
  readonly viewHeight: number
  /** Carried session across stage transitions (lives/score); fresh if omitted. */
  readonly session?: Session
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
  // Loop 2 (the second quest) is harder: less time on the clock.
  const timeScale = loop >= 2 ? 0.75 : 1
  const stageSeconds = Math.round(level.durationSeconds * timeScale)
  const start = { x: level.playerStart.x, y: level.playerStart.y }
  const config: MatchConfig = {
    levelIndex,
    loop,
    // Level geometry plus invisible world-boundary walls (left/right).
    solids: [
      ...level.solids,
      aabb(-40, -200, 40, worldHeight + 600),
      aabb(level.worldWidth, -200, 40, worldHeight + 600),
    ],
    ladders: level.ladders.map((l) => l),
    hazards: (level.hazards ?? []).map((h) => h),
    bounds: { minX: 0, maxX: level.worldWidth },
    deathY: worldHeight + 40,
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
  const state: MatchState = {
    player: createPlayer(start.x, start.y),
    weapon: createWeapon(),
    // The knight starts with the dagger + torch (plus armor); the axe (and the
    // curse's lance) are earned from chests/drops, so picking weapons up matters.
    activeWeapon: DAGGER,
    ownedWeapons: [DAGGER.id, TORCH.id],
    enemies: [],
    enemyProjectiles: [],
    chests,
    drops: [],
    spawner: createSpawner(level.spawns),
    timer: createTimer(stageSeconds),
    session: opts.session ?? createSession(),
    rng,
    phase: 'playing',
  }
  return { config, state }
}

/** Apply a collected chest/drop reward, returning the new state pieces, the bus
 *  notifications it triggers, and the float label/color for the pickup text. */
const applyReward = (
  state: MatchState,
  reward: ChestReward,
): {
  player: Player
  session: Session
  activeWeapon: MatchState['activeWeapon']
  ownedWeapons: readonly string[]
  effects: Effect[]
  label: string
  color: string
} => {
  let { player, session, activeWeapon } = state
  let ownedWeapons = state.ownedWeapons
  const effects: Effect[] = []
  let label: string
  let color: string
  /** Equip a weapon, adding it to the owned set (keeps active ∈ owned). */
  const equip = (def: WeaponDef) => {
    activeWeapon = def
    if (!ownedWeapons.includes(def.id)) ownedWeapons = [...ownedWeapons, def.id]
    effects.push(notify({ kind: 'weapon', weapon: def.id }))
  }
  switch (reward.kind) {
    case 'weapon': {
      const def = weaponById(reward.weaponId)
      if (def) equip(def)
      color = hexColor(WEAPON_COLOR[reward.weaponId] ?? 0xffffff)
      label = `${reward.weaponId.toUpperCase()}!`
      break
    }
    case 'curse':
      // The magician's curse downgrades you to the lance (and adds it to the cycle).
      equip(LANCE)
      label = 'CURSED!'
      color = '#ff5555'
      break
    case 'armor':
      player = { ...player, armor: pickupArmor(player.armor) }
      label = 'ARMOR!'
      color = '#7fdfff'
      break
    case 'points':
      session = addScore(session, reward.points)
      effects.push(notify({ kind: 'score', score: session.score }))
      label = `+${reward.points}`
      color = '#ffd23a'
      break
    case 'life':
      session = gainLife(session)
      effects.push(notify({ kind: 'lives', lives: session.lives }))
      label = '1UP!'
      color = '#7cfc00'
      break
  }
  return { player, session, activeWeapon, ownedWeapons, effects, label, color }
}

/** Death of the knight: lose a life, then game-over or respawn (state + effects). */
const handleDeath = (config: MatchConfig, state: MatchState): StepResult => {
  const pb = state.player.body
  const effects: Effect[] = [
    { type: 'vfx', name: 'explosion', x: pb.pos.x + pb.w / 2, y: pb.pos.y + pb.h / 2, scale: 0.42 },
    { type: 'shake', ms: 320, intensity: 0.02 },
  ]
  const session = loseLife(state.session)
  effects.push(notify({ kind: 'lives', lives: session.lives }))
  if (session.state === 'gameover') {
    effects.push(notify({ kind: 'over', score: session.score }))
    return { state: { ...state, session, phase: 'gameover' }, effects }
  }
  // Respawn in place: fresh player + timer, armor restored.
  effects.push(notify({ kind: 'armor', armor: 'armored' }))
  return {
    state: {
      ...state,
      session,
      player: createPlayer(config.start.x, config.start.y),
      timer: createTimer(config.stageSeconds),
      phase: 'playing',
    },
    effects,
  }
}

/** Boss HP bar notifications, derived from the boss before/after this step. */
const bossNotifications = (prev: readonly Enemy[], next: readonly Enemy[]): Effect[] => {
  const after = next.find((e) => e.kind === 'boss')
  if (!after) return []
  if (after.state === 'dead') {
    const before = prev.find((e) => e.kind === 'boss')
    return before && before.state !== 'dead' ? [notify({ kind: 'boss-cleared' })] : []
  }
  const before = prev.find((e) => e.kind === 'boss')
  return !before || before.hp !== after.hp
    ? [notify({ kind: 'boss-hp', hp: after.hp, maxHp: BOSS_VARIANTS[after.variant ?? 1].hp })]
    : []
}

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
    ...spawn.due.map((ev) => spawnEnemy(ev.kind, ev.x, ev.y, config.levelIndex)),
  ]
  const b0 = state.player.body
  const target = { x: b0.pos.x + b0.w / 2, y: b0.pos.y + b0.h / 2 }
  const stepped = enemies.map((e) => stepEnemy(e, target, config.solids, dt))
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
  for (const c of eadv.culled) {
    if (c.reason === 'wall')
      effects.push({
        type: 'vfx',
        name: 'spark',
        x: c.projectile.pos.x + c.projectile.w / 2,
        y: c.projectile.pos.y + c.projectile.h / 2,
        scale: 0.1,
      })
  }

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
      meleeBox =
        state.player.facing > 0
          ? aabb(pb.pos.x + pb.w, pb.pos.y, MELEE_REACH, pb.h)
          : aabb(pb.pos.x - MELEE_REACH, pb.pos.y, MELEE_REACH, pb.h)
    }
  }
  const wadv = advanceProjectilesDetailed(weapon.projectiles, dt, config.bounds, config.solids)
  weapon = { cooldownLeft: Math.max(0, weapon.cooldownLeft - dt), projectiles: wadv.alive }
  for (const c of wadv.culled) {
    if (c.reason === 'wall')
      effects.push({
        type: 'vfx',
        name: 'spark',
        x: c.projectile.pos.x + c.projectile.w / 2,
        y: c.projectile.pos.y + c.projectile.h / 2,
        scale: 0.1,
      })
  }

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
          scale: 0.14,
        })
      } else if (e.kind === 'boss' || rng.next() < DROP_CHANCE) {
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
  })

  effects.push(...bossNotifications(before, enemies))

  let session = state.session
  if (kills > 0) {
    session = addScore(session, kills * SCORE_PER_KILL)
    effects.push(notify({ kind: 'score', score: session.score }))
    effects.push({ type: 'shake', ms: 90, intensity: 0.006 }) // a small kick per kill
  }

  // 5. Enemy projectiles + hazards vs the player → step the FSM.
  const ep = resolveEnemyProjectiles(playerBox, enemyProjectiles)
  enemyProjectiles = [...ep.projectiles]
  const damaged = combat.playerHit || ep.playerHit || touchesHazard(playerBox, config.hazards)
  const prevIFrames = state.player.armor.iFramesLeft
  let player = stepPlayer(
    state.player,
    input,
    { solids: config.solids, ladders: config.ladders, damaged },
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
      scale: 0.18,
    })
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
    activeWeapon: state.activeWeapon,
  }

  // Fell into a pit: a drop below the world bottom costs a life.
  if (hasFallenOut(player.body, config.deathY)) {
    const dead = handleDeath(config, next)
    return { state: dead.state, effects: [...effects, ...dead.effects] }
  }

  // 6. Collect chests / drops the knight is touching.
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
      effects.push({ type: 'vfx', name: 'magic_ring', x: cx, y: mid, scale: 1.1 })
      effects.push({
        type: 'float',
        label: r.label,
        color: r.color,
        reward,
        x: cx,
        y: top - 30 - n * 18,
      })
    })
    next = { ...next, [which]: newList }
  }

  // 7. Armor change feedback.
  if (player.armor.state !== state.player.armor.state) {
    effects.push(notify({ kind: 'armor', armor: player.armor.state }))
    effects.push({ type: 'shake', ms: 150, intensity: 0.01 })
  }

  next = { ...next, player, session }

  // 8. Death by the last hit → lose a life / game-over.
  if (player.armor.state === 'dead') {
    const dead = handleDeath(config, next)
    return { state: dead.state, effects: [...effects, ...dead.effects] }
  }

  // 9. Stage cleared: spawner done and every spawned enemy dead.
  if (isFinished(spawner) && enemies.length > 0 && enemies.every((e) => e.state === 'dead')) {
    return { state: { ...next, phase: 'cleared' }, effects }
  }

  return { state: next, effects }
}
