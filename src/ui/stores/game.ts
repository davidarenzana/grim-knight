import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bus, type ArmorState } from '@shared/events'
import { insertScore, qualifies, sanitizeName, type HighScore } from '@core/rules/highscores'
import { loadAudioPref, saveAudioPref, loadScores, saveScores } from './persistence'

export type Screen =
  | 'menu'
  | 'levels'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'enterscore'
  | 'highscores'

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

  /** Persisted high-score table (top 10, descending). */
  const scores = ref<HighScore[]>(loadScores())
  /** Row index just inserted (for highlight on the table); -1 when none. */
  const lastRank = ref(-1)
  /** The run's final score awaiting initials (set when a run ends qualifying). */
  const pendingScore = ref(0)

  /** End-of-run router: jump to initials entry if the score makes the table. */
  function finishRun(finalScore: number): void {
    if (qualifies(scores.value, finalScore)) {
      pendingScore.value = finalScore
      screen.value = 'enterscore'
    } else {
      lastRank.value = -1
      screen.value = 'gameover'
    }
  }

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
    bus.on('game:over', (e) => finishRun(e.score))
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
  }

  /** Open the stage-select screen. */
  function openLevels(): void {
    screen.value = 'levels'
  }

  /** Begin a run at the given 0-based stage index. */
  function startAtLevel(index: number): void {
    startLevel.value = index
    screen.value = 'playing'
  }

  /** Return to the title screen from level select. */
  function backToMenu(): void {
    screen.value = 'menu'
  }

  /** Open the high-score table (from the menu); no row is highlighted. */
  function openHighScores(): void {
    scores.value = loadScores()
    lastRank.value = -1
    screen.value = 'highscores'
  }

  /** Commit the pending run with the typed initials, persist, show the table. */
  function submitScore(rawInitials: string): void {
    const entry: HighScore = {
      name: sanitizeName(rawInitials),
      score: pendingScore.value,
      level: level.value,
      loop: loop.value,
    }
    const { table, rank } = insertScore(scores.value, entry)
    scores.value = table
    lastRank.value = rank
    saveScores(table)
    screen.value = 'highscores'
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
  }

  function quitToMenu(): void {
    screen.value = 'menu'
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
    scores,
    lastRank,
    pendingScore,
    bind,
    toggleAudio,
    startGame,
    openLevels,
    startAtLevel,
    backToMenu,
    openHighScores,
    submitScore,
    pause,
    resume,
    restart,
    quitToMenu,
  }
})
