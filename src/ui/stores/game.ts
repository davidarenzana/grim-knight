import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bus, type ArmorState } from '@shared/events'

export type Screen = 'menu' | 'playing' | 'paused' | 'gameover' | 'won'

/**
 * Game state exposed to the UI. It is a MIRROR of what happens in the
 * simulation: it updates by listening to the event bus, never the other way around.
 * UI actions emit `ui:*` commands on the bus.
 */
export const useGameStore = defineStore('game', () => {
  const screen = ref<Screen>('menu')
  const score = ref(0)
  const lives = ref(3)
  const armor = ref<ArmorState>('armored')
  const weapon = ref('lance')
  const secondsLeft = ref(0)
  const level = ref(1)
  const loop = ref(1)

  /** Subscribes the store to the bus. Called once at app bootstrap. */
  function bind(): void {
    bus.on('game:score-changed', (e) => (score.value = e.score))
    bus.on('game:lives-changed', (e) => (lives.value = e.lives))
    bus.on('game:armor-changed', (e) => (armor.value = e.armor))
    bus.on('game:weapon-changed', (e) => (weapon.value = e.weapon))
    bus.on('game:time-changed', (e) => (secondsLeft.value = e.secondsLeft))
    bus.on('game:level-changed', (e) => {
      level.value = e.level
      loop.value = e.loop
    })
    bus.on('game:over', () => (screen.value = 'gameover'))
    bus.on('game:won', () => (screen.value = 'won'))
  }

  function startGame(): void {
    screen.value = 'playing'
    bus.emit('ui:start', {})
  }

  function pause(): void {
    screen.value = 'paused'
    bus.emit('ui:pause')
  }

  function resume(): void {
    screen.value = 'playing'
    bus.emit('ui:resume')
  }

  function restart(): void {
    screen.value = 'playing'
    bus.emit('ui:restart')
  }

  function quitToMenu(): void {
    screen.value = 'menu'
    bus.emit('ui:quit')
  }

  return {
    screen,
    score,
    lives,
    armor,
    weapon,
    secondsLeft,
    level,
    loop,
    bind,
    startGame,
    pause,
    resume,
    restart,
    quitToMenu,
  }
})
