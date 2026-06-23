import { describe, it, expect } from 'vitest'
import { aabb } from '@core/math/aabb'
import { createRng } from '@core/math/rng'
import { GROUND_Y } from '@core/level/geometry'
import { createPlayer, PLAYER_H, NO_INPUT, type PlayerInput } from '@core/fsm/player'
import { createWeapon, DAGGER, TORCH } from '@core/weapons/weapon'
import { createSession } from '@core/rules/session'
import { difficultyForLoop } from '@core/rules/difficulty'
import { createTimer } from '@core/level/timer'
import { createSpawner } from '@core/level/spawner'
import { createChest } from '@core/level/chest'
import { createZombie } from '@core/enemies'
import { LEVELS } from '@core/level/level'
import { stepMatch, createMatch } from './match'
import type { Effect, GameNotification, MatchConfig, MatchState } from './types'

// Integration tests for the application use case: drive whole-match scenarios
// headlessly (no Phaser) and assert state transitions + emitted effects. These
// guard the bug classes that unit tests on isolated core functions can't see
// (soft-lock culling, win condition, damage/death flow, pickups).

const START = { x: 80, y: GROUND_Y - PLAYER_H }

const makeConfig = (over: Partial<MatchConfig> = {}): MatchConfig => ({
  levelIndex: 0,
  loop: 1,
  difficulty: difficultyForLoop(over.loop ?? 1),
  solids: [aabb(0, GROUND_Y, 4000, 40)],
  ladders: [],
  hazards: [],
  bounds: { minX: 0, maxX: 4000 },
  deathY: 600,
  sinkY: GROUND_Y,
  start: START,
  stageSeconds: 99,
  ...over,
})

const makeState = (over: Partial<MatchState> = {}): MatchState => ({
  player: createPlayer(START.x, START.y),
  weapon: createWeapon(),
  activeWeapon: DAGGER,
  ownedWeapons: [DAGGER.id, TORCH.id],
  enemies: [],
  enemyProjectiles: [],
  chests: [],
  drops: [],
  spawner: createSpawner([]),
  timer: createTimer(99),
  session: createSession(),
  rng: createRng(1),
  phase: 'playing',
  ...over,
})

const press = (k: Partial<PlayerInput>): PlayerInput => ({ ...NO_INPUT, ...k })

/** Run N fixed steps, threading state and collecting every emitted effect. */
const run = (config: MatchConfig, state: MatchState, input: PlayerInput, n: number) => {
  let s = state
  const effects: Effect[] = []
  for (let i = 0; i < n; i++) {
    const r = stepMatch(config, s, input, 1 / 60)
    s = r.state
    effects.push(...r.effects)
  }
  return { state: s, effects }
}

const notifies = (effects: readonly Effect[], kind: GameNotification['kind']): boolean =>
  effects.some((e) => e.type === 'notify' && e.notification.kind === kind)

describe('stepMatch', () => {
  it('is a no-op once the run has ended (terminal phase)', () => {
    const state = makeState({ phase: 'gameover' })
    const r = stepMatch(makeConfig(), state, press({ right: true, attack: true }), 1 / 60)
    expect(r.state).toBe(state)
    expect(r.effects).toEqual([])
  })

  it('is deterministic: same seed + inputs ⇒ identical state and effect count', () => {
    const input = press({ right: true, attack: true })
    const a = run(makeConfig(), makeState({ rng: createRng(42) }), input, 60)
    const b = run(makeConfig(), makeState({ rng: createRng(42) }), input, 60)
    expect(a.state.player.body.pos).toEqual(b.state.player.body.pos)
    expect(a.effects.length).toBe(b.effects.length)
  })

  it('notifies the HUD when the stage clock crosses a whole second', () => {
    const r = run(makeConfig(), makeState(), NO_INPUT, 61) // ~1.02s elapsed
    expect(notifies(r.effects, 'time')).toBe(true)
  })

  it('time-out costs a life and respawns when lives remain', () => {
    const config = makeConfig({ stageSeconds: 50 })
    const before = makeState({ timer: createTimer(0.01) })
    const r = stepMatch(config, before, NO_INPUT, 1 / 60)
    expect(r.state.session.lives).toBe(before.session.lives - 1)
    expect(r.state.timer.secondsLeft).toBe(50) // timer reset on respawn
    expect(r.state.phase).toBe('playing')
    expect(notifies(r.effects, 'lives')).toBe(true)
  })

  it('falling past the world bottom drains lives and finally ends in gameover', () => {
    // deathY above the floor → the grounded knight is "fallen out" every tick.
    const r = run(makeConfig({ deathY: 300 }), makeState(), NO_INPUT, 12)
    expect(r.state.phase).toBe('gameover')
    expect(notifies(r.effects, 'over')).toBe(true)
  })

  it('culls a ground enemy wedged below the floor (soft-lock safety net)', () => {
    const sunk = createZombie(200, GROUND_Y + 100)
    const r = stepMatch(makeConfig(), makeState({ enemies: [sunk] }), NO_INPUT, 1 / 60)
    expect(r.state.enemies[0]!.state).toBe('dead')
  })

  it('clears the stage when the spawner is finished and every enemy is dead', () => {
    const dead = { ...createZombie(200, GROUND_Y - PLAYER_H), state: 'dead' as const, hp: 0 }
    const r = stepMatch(makeConfig(), makeState({ enemies: [dead] }), NO_INPUT, 1 / 60)
    expect(r.state.phase).toBe('cleared')
  })

  it('wakes a spawned enemy when the player walks within range', () => {
    const spawner = createSpawner([{ kind: 'zombie', x: 120, y: GROUND_Y - PLAYER_H }])
    const r = stepMatch(makeConfig(), makeState({ spawner }), NO_INPUT, 1 / 60)
    expect(r.state.enemies.length).toBe(1)
    expect(r.state.enemies[0]!.kind).toBe('zombie')
  })

  it('throwing kills an adjacent enemy and scores it', () => {
    const z = createZombie(130, GROUND_Y - PLAYER_H)
    const r = run(makeConfig(), makeState({ enemies: [z] }), press({ attack: true }), 60)
    expect(r.state.enemies[0]!.state).toBe('dead')
    expect(notifies(r.effects, 'score')).toBe(true)
  })

  it('scales enemy hp by the loop difficulty', () => {
    const spawner = createSpawner([{ kind: 'zombie', x: 120, y: GROUND_Y - PLAYER_H }])
    const r = stepMatch(makeConfig({ loop: 3 }), makeState({ spawner }), NO_INPUT, 1 / 60)
    // base zombie hp 1 × enemyHpMul 2 (loop 3) = 2
    expect(r.state.enemies[0]!.hp).toBe(2)
  })

  it('makes spawned enemies move faster on deeper loops', () => {
    const at = { kind: 'zombie' as const, x: 200, y: GROUND_Y - PLAYER_H }
    // Walk the knight to the right so the zombie wakes, then chases at its speed.
    const baseline = run(
      makeConfig({ loop: 1 }),
      makeState({ spawner: createSpawner([at]) }),
      press({ right: true }),
      120,
    )
    const harder = run(
      makeConfig({ loop: 3 }),
      makeState({ spawner: createSpawner([at]) }),
      press({ right: true }),
      120,
    )
    const base = baseline.state.enemies[0]!
    const fast = harder.state.enemies[0]!
    expect(fast.speedScale).toBe(difficultyForLoop(3).enemySpeedMul)
    // Faster chaser covers more ground from the same spawn over the same window.
    const moved = (e: typeof base) => Math.abs(e.body.pos.x - at.x)
    expect(moved(fast)).toBeGreaterThan(moved(base))
  })

  it('scales kill score by the loop difficulty', () => {
    const z = createZombie(130, GROUND_Y - PLAYER_H)
    const r = run(makeConfig({ loop: 3 }), makeState({ enemies: [z] }), press({ attack: true }), 60)
    expect(r.state.enemies[0]!.state).toBe('dead')
    // one kill × SCORE_PER_KILL (100) × scoreMul 2 (loop 3) = 200
    expect(r.state.session.score).toBe(200)
  })

  it('emits sound cues: throw on firing, kill when an enemy dies', () => {
    const z = createZombie(130, GROUND_Y - PLAYER_H)
    const r = run(makeConfig(), makeState({ enemies: [z] }), press({ attack: true }), 60)
    const sounds = r.effects.filter((e) => e.type === 'sound').map((e) => e.name)
    expect(sounds).toContain('throw')
    expect(sounds).toContain('kill')
  })

  it('applies a points chest on contact: score + HUD notify + float label', () => {
    const chest = createChest(START.x, START.y, { kind: 'points', points: 500 })
    const r = stepMatch(makeConfig(), makeState({ chests: [chest] }), NO_INPUT, 1 / 60)
    expect(r.state.chests[0]!.opened).toBe(true)
    expect(r.state.session.score).toBe(500)
    expect(notifies(r.effects, 'score')).toBe(true)
    expect(r.effects.some((e) => e.type === 'float')).toBe(true)
  })

  it('applies a weapon chest: equips it, adds it to the owned set + notifies', () => {
    const chest = createChest(START.x, START.y, { kind: 'weapon', weaponId: 'axe' })
    const r = stepMatch(makeConfig(), makeState({ chests: [chest] }), NO_INPUT, 1 / 60)
    expect(r.state.activeWeapon.id).toBe('axe')
    expect(r.state.ownedWeapons).toContain('axe') // earned, not owned from the start
    expect(notifies(r.effects, 'weapon')).toBe(true)
  })
})

describe('createMatch', () => {
  it('builds a playable initial state from a LevelDef', () => {
    const { config, state } = createMatch(LEVELS[0]!, {
      levelIndex: 0,
      loop: 1,
      rng: createRng(7),
      viewHeight: 450,
    })
    expect(state.phase).toBe('playing')
    expect(state.activeWeapon.id).toBe('dagger')
    expect(state.ownedWeapons).toEqual(['dagger', 'torch']) // earn the rest from chests
    expect(state.player.body.pos.x).toBe(LEVELS[0]!.playerStart.x)
    expect(config.bounds.maxX).toBe(LEVELS[0]!.worldWidth)
    expect(config.stageSeconds).toBe(LEVELS[0]!.durationSeconds) // loop 1: no time scale
  })

  it('shortens the clock on deeper loops (more time pressure)', () => {
    const { config } = createMatch(LEVELS[0]!, {
      levelIndex: 0,
      loop: 3,
      rng: createRng(1),
      viewHeight: 450,
    })
    const expected = Math.round(LEVELS[0]!.durationSeconds * difficultyForLoop(3).timeScale)
    expect(config.stageSeconds).toBe(expected)
    expect(config.difficulty.name).toBe('INFERNAL')
  })

  it('steps a real level without throwing and stays playing', () => {
    const { config, state } = createMatch(LEVELS[0]!, {
      levelIndex: 0,
      loop: 1,
      rng: createRng(3),
      viewHeight: 450,
    })
    const r = run(config, state, press({ right: true }), 30)
    expect(r.state.phase).toBe('playing')
  })
})
