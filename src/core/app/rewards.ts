import type { Player } from '@core/fsm/player'
import { weaponById, LANCE, type WeaponDef } from '@core/weapons/weapon'
import type { ChestReward } from '@core/level/chest'
import { addScore, gainLife, type Session } from '@core/rules/session'
import { pickupArmor } from '@core/rules/armor'
import type { Effect, MatchState } from './types'
import { notify, hexColor } from './effects'
import { WEAPON_COLOR, DEFAULT_WEAPON_COLOR, REWARD_COLOR } from './tuning'

/** The state pieces a collected reward mutates, plus its bus effects + float text. */
export interface AppliedReward {
  player: Player
  session: Session
  activeWeapon: MatchState['activeWeapon']
  ownedWeapons: readonly string[]
  effects: Effect[]
  label: string
  color: string
}

/** Apply a collected chest/drop reward, returning the new state pieces, the bus
 *  notifications it triggers, and the float label/color for the pickup text. */
export const applyReward = (state: MatchState, reward: ChestReward): AppliedReward => {
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
      color = hexColor(WEAPON_COLOR[reward.weaponId] ?? DEFAULT_WEAPON_COLOR)
      label = `${reward.weaponId.toUpperCase()}!`
      break
    }
    case 'curse':
      // The magician's curse downgrades you to the lance (and adds it to the cycle).
      equip(LANCE)
      label = 'CURSED!'
      color = REWARD_COLOR.curse
      break
    case 'armor':
      player = { ...player, armor: pickupArmor(player.armor) }
      label = 'ARMOR!'
      color = REWARD_COLOR.armor
      break
    case 'points':
      session = addScore(session, reward.points)
      effects.push(notify({ kind: 'score', score: session.score }))
      label = `+${reward.points}`
      color = REWARD_COLOR.points
      break
    case 'life':
      session = gainLife(session)
      effects.push(notify({ kind: 'lives', lives: session.lives }))
      label = '1UP!'
      color = REWARD_COLOR.life
      break
  }
  return { player, session, activeWeapon, ownedWeapons, effects, label, color }
}
