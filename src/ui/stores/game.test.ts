import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bus, type GameEvents } from '@shared/events'
import { insertScore, parseSubmission, type HighScore } from '@core/rules/highscores'
import { useGameStore } from './game'

// The store mirrors the bus and drives the online leaderboard (`/api/scores`).
// Pinia runs headless (no DOM). We stub `fetch` with a faithful mock of the
// server: it stores a table in `serverTable` and inserts via the SAME pure core
// (`insertScore`/`parseSubmission`) the real endpoint uses, so the tests exercise
// the real client⇄server contract. Set `failNetwork` to simulate an outage.
describe('game store', () => {
  let serverTable: HighScore[] = []
  let failNetwork = false

  const jsonResponse = (data: unknown): Response =>
    ({ ok: true, status: 200, json: async () => data }) as Response

  beforeEach(() => {
    bus.all.clear()
    setActivePinia(createPinia())
    serverTable = []
    failNetwork = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit): Promise<Response> => {
        if (failNetwork) throw new Error('network down')
        if ((init?.method ?? 'GET') === 'POST') {
          const entry = parseSubmission(JSON.parse(String(init?.body)))
          if (!entry) return { ok: false, status: 400, json: async () => ({}) } as Response
          const { table, rank } = insertScore(serverTable, entry)
          serverTable = table
          return jsonResponse({ table, rank })
        }
        return jsonResponse(serverTable)
      }),
    )
  })

  afterEach(() => vi.unstubAllGlobals())

  /** Capture the payload of the next `ui:*` command of the given type. */
  const capture = <K extends keyof GameEvents>(event: K): { value: GameEvents[K] | undefined } => {
    const box: { value: GameEvents[K] | undefined } = { value: undefined }
    bus.on(event, (p) => (box.value = p as GameEvents[K]))
    return box
  }

  /** Track whether a (possibly void-payload) command fired. */
  const fired = (event: keyof GameEvents): { value: boolean } => {
    const box = { value: false }
    bus.on(event, () => (box.value = true))
    return box
  }

  describe('mirrors bus events into state (with the right values)', () => {
    it('mirrors the HUD values', () => {
      const store = useGameStore()
      store.bind()
      bus.emit('game:score-changed', { score: 1300 })
      bus.emit('game:lives-changed', { lives: 2 })
      bus.emit('game:armor-changed', { armor: 'underwear' })
      bus.emit('game:weapon-changed', { weapon: 'axe' })
      bus.emit('game:time-changed', { secondsLeft: 87 })
      bus.emit('game:level-changed', { level: 4, loop: 2 })
      expect(store.score).toBe(1300)
      expect(store.lives).toBe(2)
      expect(store.armor).toBe('underwear')
      expect(store.weapon).toBe('axe')
      expect(store.secondsLeft).toBe(87)
      expect(store.level).toBe(4)
      expect(store.loop).toBe(2)
    })

    it('tracks the boss bar: hp on game:boss-hp, hidden on cleared/ready', () => {
      const store = useGameStore()
      store.bind()
      bus.emit('game:boss-hp', { hp: 7, maxHp: 10 })
      expect(store.bossActive).toBe(true)
      expect(store.bossHp).toBe(7)
      expect(store.bossMaxHp).toBe(10)
      bus.emit('game:boss-cleared')
      expect(store.bossActive).toBe(false)
      bus.emit('game:boss-hp', { hp: 3, maxHp: 10 })
      expect(store.bossActive).toBe(true)
      bus.emit('game:ready')
      expect(store.bossActive).toBe(false)
    })

    it('a qualifying terminal event routes to initials entry', async () => {
      // With an empty table any score makes the top ten → enter initials first.
      const over = useGameStore()
      over.bind()
      bus.emit('game:over', { score: 999 })
      await vi.waitFor(() => expect(over.screen).toBe('enterscore'))
      expect(over.pendingScore).toBe(999)
    })

    it('a non-qualifying terminal event shows the outcome screen directly', async () => {
      // Pre-fill the leaderboard with ten unbeatable runs.
      serverTable = Array.from({ length: 10 }, () => ({
        name: 'AAA',
        score: 10000,
        level: 1,
        loop: 1,
      }))
      const store = useGameStore()
      store.bind()
      bus.emit('game:over', { score: 5 })
      await vi.waitFor(() => expect(store.screen).toBe('gameover'))
      expect(store.lastRank).toBe(-1)
    })
  })

  describe('UI actions switch screens and emit ui:* commands', () => {
    it('startGame → playing, startLevel 0', () => {
      const store = useGameStore()
      store.startGame()
      expect(store.screen).toBe('playing')
      expect(store.startLevel).toBe(0)
    })

    it('openLevels → levels (no command)', () => {
      const store = useGameStore()
      store.openLevels()
      expect(store.screen).toBe('levels')
    })

    it('startAtLevel(i) → playing, startLevel i', () => {
      const store = useGameStore()
      store.startAtLevel(3)
      expect(store.screen).toBe('playing')
      expect(store.startLevel).toBe(3)
    })

    it('backToMenu → menu', () => {
      const store = useGameStore()
      store.openLevels()
      store.backToMenu()
      expect(store.screen).toBe('menu')
    })

    it('pause / resume emit their commands and toggle the screen', () => {
      const store = useGameStore()
      const paused = fired('ui:pause')
      const resumed = fired('ui:resume')
      store.pause()
      expect(store.screen).toBe('paused')
      expect(paused.value).toBe(true)
      store.resume()
      expect(store.screen).toBe('playing')
      expect(resumed.value).toBe(true)
    })

    it('toggleAudio flips the flag and emits ui:audio', () => {
      const store = useGameStore()
      const audio = capture('ui:audio')
      const before = store.audioOn
      store.toggleAudio()
      expect(store.audioOn).toBe(!before)
      expect(audio.value).toEqual({ on: !before })
    })

    it('bind emits the initial audio preference', () => {
      const store = useGameStore()
      const audio = capture('ui:audio')
      store.bind()
      expect(audio.value).toEqual({ on: store.audioOn })
    })

    it('submitScore posts the run with sanitized initials and shows the table', async () => {
      const store = useGameStore()
      store.bind()
      bus.emit('game:level-changed', { level: 4, loop: 2 })
      bus.emit('game:over', { score: 999 })
      await vi.waitFor(() => expect(store.screen).toBe('enterscore'))
      await store.submitScore('dav')
      expect(store.scores[0]).toEqual({ name: 'DAV', score: 999, level: 4, loop: 2 })
      expect(store.lastRank).toBe(0)
      expect(store.screen).toBe('highscores')
    })

    it('submitScore surfaces an error when the leaderboard is unreachable (no local fallback)', async () => {
      const store = useGameStore()
      store.bind()
      bus.emit('game:level-changed', { level: 2, loop: 1 })
      bus.emit('game:over', { score: 500 })
      await vi.waitFor(() => expect(store.screen).toBe('enterscore'))
      failNetwork = true
      await store.submitScore('zoe')
      // The leaderboard is the single source of truth: a failed submit is NOT
      // recorded locally — it just flags an error.
      expect(store.scoresError).toBe(true)
      expect(store.lastRank).toBe(-1)
      expect(store.scores).toHaveLength(0)
      expect(store.screen).toBe('highscores')
    })

    it('openHighScores → highscores with no highlighted row', async () => {
      const store = useGameStore()
      await store.openHighScores()
      expect(store.screen).toBe('highscores')
      expect(store.lastRank).toBe(-1)
    })

    it('restart → playing; quitToMenu → menu', () => {
      const store = useGameStore()
      store.restart()
      expect(store.screen).toBe('playing')
      store.quitToMenu()
      expect(store.screen).toBe('menu')
    })
  })
})
