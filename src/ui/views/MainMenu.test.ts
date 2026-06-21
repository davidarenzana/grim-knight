// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { bus } from '@shared/events'
import MainMenu from './MainMenu.vue'
import { useGameStore } from '@ui/stores/game'

describe('MainMenu', () => {
  let pinia: Pinia
  beforeEach(() => {
    bus.all.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const findButton = (wrapper: ReturnType<typeof mount>, text: string) =>
    wrapper.findAll('button').find((b) => b.text().toUpperCase().includes(text))!

  it('renders the title and the call-to-actions', () => {
    const wrapper = mount(MainMenu, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('GRIM')
    expect(wrapper.findAll('button').length).toBe(3)
  })

  it('START begins a run at the first stage', async () => {
    const wrapper = mount(MainMenu, { global: { plugins: [pinia] } })
    await findButton(wrapper, 'START').trigger('click')
    const store = useGameStore()
    expect(store.screen).toBe('playing')
    expect(store.startLevel).toBe(0)
  })

  it('SELECT STAGE opens the stage picker', async () => {
    const wrapper = mount(MainMenu, { global: { plugins: [pinia] } })
    await findButton(wrapper, 'SELECT').trigger('click')
    expect(useGameStore().screen).toBe('levels')
  })

  it('HIGH SCORES opens the ranking', async () => {
    const wrapper = mount(MainMenu, { global: { plugins: [pinia] } })
    await findButton(wrapper, 'HIGH SCORES').trigger('click')
    expect(useGameStore().screen).toBe('highscores')
  })
})
