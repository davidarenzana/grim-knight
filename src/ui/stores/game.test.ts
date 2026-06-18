import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { bus } from '@shared/events'
import { useGameStore } from './game'

// Smoke tests for the UI<->game bridge. Pinia runs headless (no DOM needed).
describe('game store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('mirrors game events into state', () => {
    const store = useGameStore()
    store.bind()
    bus.emit('game:score-changed', { score: 300 })
    bus.emit('game:lives-changed', { lives: 2 })
    bus.emit('game:armor-changed', { armor: 'underwear' })
    expect(store.score).toBe(300)
    expect(store.lives).toBe(2)
    expect(store.armor).toBe('underwear')
  })

  it('switches to gameover on game:over', () => {
    const store = useGameStore()
    store.bind()
    bus.emit('game:over', { score: 999 })
    expect(store.screen).toBe('gameover')
  })

  it('startGame moves to playing and emits ui:start', () => {
    const store = useGameStore()
    let started = false
    bus.on('ui:start', () => (started = true))
    store.startGame()
    expect(store.screen).toBe('playing')
    expect(started).toBe(true)
  })
})
