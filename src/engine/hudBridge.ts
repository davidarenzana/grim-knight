import { bus } from '@shared/events'
import { type GameNotification, type MatchState } from '@core/app'

/**
 * Translates the application's domain notifications into UI event-bus messages.
 * This is the engine adapter's HUD port: `core/app` returns notifications as
 * data (it never touches the bus), and these helpers map them onto the Vue HUD.
 */

/** Map a single application notification onto the UI event bus. */
export function emitNotification(n: GameNotification): void {
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

/** Push the initial HUD state, read from a freshly-built match. */
export function emitInitialHud(state: MatchState, levelIndex: number, loop: number): void {
  bus.emit('game:ready')
  bus.emit('game:armor-changed', { armor: state.player.armor.state })
  bus.emit('game:lives-changed', { lives: state.session.lives })
  bus.emit('game:score-changed', { score: state.session.score })
  bus.emit('game:weapon-changed', { weapon: state.activeWeapon.id })
  bus.emit('game:time-changed', { secondsLeft: state.timer.secondsLeft })
  bus.emit('game:level-changed', { level: levelIndex + 1, loop })
}
