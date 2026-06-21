import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bus, type ArmorState } from '@shared/events'

export type Screen = 'menu' | 'levels' | 'playing' | 'paused' | 'gameover' | 'won'

const AUDIO_KEY = 'grim:audio'
/** Read the persisted audio preference (default ON). Guarded for the node test env. */
const loadAudioPref = (): boolean => {
  try {
    return typeof localStorage === 'undefined' || localStorage.getItem(AUDIO_KEY) !== 'off'
  } catch {
    return true
  }
}
const saveAudioPref = (on: boolean): void => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(AUDIO_KEY, on ? 'on' : 'off')
  } catch {
    /* ignore (private mode / no storage) */
  }
}

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
  const bossActive = ref(false)
  const bossHp = ref(0)
  const bossMaxHp = ref(0)
  /** 0-based stage the next run begins at (set by the level-select screen). */
  const startLevel = ref(0)
  /** Audio on/off (persisted). The audio adapter listens for `ui:audio`. */
  const audioOn = ref(loadAudioPref())

  /** Subscribes the store to the bus. Called once at app bootstrap. */
  function bind(): void {
    bus.on('game:ready', () => {
      bossActive.value = false
    })
    bus.on('game:boss-hp', (e) => {
      bossActive.value = true
      bossHp.value = e.hp
      bossMaxHp.value = e.maxHp
    })
    bus.on('game:boss-cleared', () => (bossActive.value = false))
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
    // Tell the audio adapter the persisted preference at boot.
    bus.emit('ui:audio', { on: audioOn.value })
  }

  /** Flip audio on/off, persist it, and notify the audio adapter. */
  function toggleAudio(): void {
    audioOn.value = !audioOn.value
    saveAudioPref(audioOn.value)
    bus.emit('ui:audio', { on: audioOn.value })
  }

  function startGame(): void {
    startLevel.value = 0
    screen.value = 'playing'
    bus.emit('ui:start', {})
  }

  /** Open the stage-select screen. */
  function openLevels(): void {
    screen.value = 'levels'
  }

  /** Begin a run at the given 0-based stage index. */
  function startAtLevel(index: number): void {
    startLevel.value = index
    screen.value = 'playing'
    bus.emit('ui:start', { level: index })
  }

  /** Return to the title screen from level select. */
  function backToMenu(): void {
    screen.value = 'menu'
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
    bossActive,
    bossHp,
    bossMaxHp,
    startLevel,
    audioOn,
    bind,
    toggleAudio,
    startGame,
    openLevels,
    startAtLevel,
    backToMenu,
    pause,
    resume,
    restart,
    quitToMenu,
  }
})
