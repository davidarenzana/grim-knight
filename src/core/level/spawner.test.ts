import { describe, expect, it } from 'vitest'
import {
  ACTIVATION_RANGE,
  createSpawner,
  isFinished,
  stepSpawner,
  type SpawnEvent,
} from './spawner'

const events: SpawnEvent[] = [
  { kind: 'zombie', x: 600, y: 410 },
  { kind: 'flyer', x: 1200, y: 120 },
]

describe('spawner', () => {
  it('nothing due while the player is far to the left', () => {
    const { due, spawner } = stepSpawner(createSpawner(events), 0)
    expect(due).toHaveLength(0)
    expect(spawner.pending).toHaveLength(2)
  })

  it('an enemy wakes once the player gets within range of it', () => {
    // Player just inside ACTIVATION_RANGE of the zombie at x=600.
    const { due, spawner } = stepSpawner(createSpawner(events), 600 - ACTIVATION_RANGE + 1)
    expect(due.map((e) => e.kind)).toEqual(['zombie'])
    expect(spawner.pending).toHaveLength(1)
  })

  it('does not re-fire an enemy that already woke', () => {
    let s = createSpawner(events)
    const first = stepSpawner(s, 600)
    s = first.spawner
    const second = stepSpawner(s, 700)
    expect(first.due.map((e) => e.kind)).toEqual(['zombie'])
    expect(second.due).toHaveLength(0)
  })

  it('finished once the player has passed every trigger', () => {
    const { spawner } = stepSpawner(createSpawner(events), 5000)
    expect(isFinished(spawner)).toBe(true)
  })

  it('triggerX overrides the spawn position', () => {
    const ambush: SpawnEvent[] = [{ kind: 'ogre', x: 1500, y: 410, triggerX: 400 }]
    const { due } = stepSpawner(createSpawner(ambush), 400 - ACTIVATION_RANGE + 1)
    expect(due.map((e) => e.kind)).toEqual(['ogre'])
  })

  it('wakes enemies in trigger-x order', () => {
    const { due } = stepSpawner(createSpawner(events), 5000)
    expect(due.map((e) => e.kind)).toEqual(['zombie', 'flyer'])
  })
})
