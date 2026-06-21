// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { bus } from '@shared/events'
import { LEVELS } from '@core/level/level'
import LevelSelect from './LevelSelect.vue'
import { useGameStore } from '@ui/stores/game'

describe('LevelSelect', () => {
  let pinia: Pinia
  beforeEach(() => {
    bus.all.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('lists one button per stage', () => {
    const wrapper = mount(LevelSelect, { global: { plugins: [pinia] } })
    expect(wrapper.findAll('button.stage').length).toBe(LEVELS.length)
  })

  it('clicking a stage starts a run there', async () => {
    const wrapper = mount(LevelSelect, { global: { plugins: [pinia] } })
    await wrapper.findAll('button.stage')[2]!.trigger('click')
    const store = useGameStore()
    expect(store.startLevel).toBe(2)
    expect(store.screen).toBe('playing')
  })

  it('BACK returns to the title screen', async () => {
    const wrapper = mount(LevelSelect, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.openLevels()
    await wrapper.find('button.back').trigger('click')
    expect(store.screen).toBe('menu')
  })
})
