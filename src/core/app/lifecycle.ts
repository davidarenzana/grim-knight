import { createPlayer } from '@core/fsm/player'
import { BOSS_VARIANTS, type Enemy } from '@core/enemies'
import { createTimer } from '@core/level/timer'
import { DAGGER, STARTING_WEAPONS } from '@core/weapons/weapon'
import { loseLife } from '@core/rules/session'
import type { Effect, MatchConfig, MatchState, StepResult } from './types'
import { notify } from './effects'
import { VFX_SCALE, SHAKE } from './tuning'

/** Death of the knight: lose a life, then game-over or respawn (state + effects). */
export const handleDeath = (config: MatchConfig, state: MatchState): StepResult => {
  const pb = state.player.body
  const effects: Effect[] = [
    {
      type: 'vfx',
      name: 'explosion',
      x: pb.pos.x + pb.w / 2,
      y: pb.pos.y + pb.h / 2,
      scale: VFX_SCALE.deathExplosion,
    },
    { type: 'shake', ...SHAKE.death },
    { type: 'sound', name: 'die' },
  ]
  const session = loseLife(state.session)
  effects.push(notify({ kind: 'lives', lives: session.lives }))
  if (session.state === 'gameover') {
    effects.push(notify({ kind: 'over', score: session.score }))
    return { state: { ...state, session, phase: 'gameover' }, effects }
  }
  // Respawn in place: fresh player + timer, armor restored, and the arsenal
  // reset to the starting kit (dagger + torch) — earned weapons are lost on death.
  effects.push(notify({ kind: 'armor', armor: 'armored' }))
  effects.push(notify({ kind: 'weapon', weapon: DAGGER.id })) // HUD back to the starting weapon
  return {
    state: {
      ...state,
      session,
      player: createPlayer(config.start.x, config.start.y),
      timer: createTimer(config.stageSeconds),
      activeWeapon: DAGGER,
      ownedWeapons: STARTING_WEAPONS,
      phase: 'playing',
    },
    effects,
  }
}

/** Boss HP bar notifications, derived from the boss before/after this step. */
export const bossNotifications = (prev: readonly Enemy[], next: readonly Enemy[]): Effect[] => {
  const after = next.find((e) => e.kind === 'boss')
  if (!after) return []
  if (after.state === 'dead') {
    const before = prev.find((e) => e.kind === 'boss')
    return before && before.state !== 'dead' ? [notify({ kind: 'boss-cleared' })] : []
  }
  const before = prev.find((e) => e.kind === 'boss')
  // Use the (possibly loop-scaled) spawn HP so the bar stays correct under scaling.
  const maxHp = after.maxHp ?? BOSS_VARIANTS[after.variant ?? 1].hp
  return !before || before.hp !== after.hp ? [notify({ kind: 'boss-hp', hp: after.hp, maxHp })] : []
}
