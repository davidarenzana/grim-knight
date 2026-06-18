import { describe, expect, it } from 'vitest'
import { createSpawner, isFinished, stepSpawner, type SpawnEvent } from './spawner'

const events: SpawnEvent[] = [
  { at: 1.0, kind: 'zombie', x: 100, y: 410 },
  { at: 2.0, kind: 'flyer', x: 300, y: 120 },
]

describe('spawner', () => {
  it('nothing due early', () => {
    const { due, spawner } = stepSpawner(createSpawner(events), 0.5)
    expect(due).toHaveLength(0)
    expect(spawner.pending).toHaveLength(2)
  })

  it('event comes due', () => {
    let s = createSpawner(events)
    let allDue: SpawnEvent[] = []
    for (let i = 0; i < 60; i++) {
      const r = stepSpawner(s, 1 / 60) // ~1s total
      s = r.spawner
      allDue = [...allDue, ...r.due]
    }
    expect(allDue.map((e) => e.kind)).toEqual(['zombie'])
    expect(s.pending).toHaveLength(1)
  })

  it('fires once', () => {
    let s = createSpawner(events)
    const first = stepSpawner(s, 1.5)
    s = first.spawner
    const second = stepSpawner(s, 0.1)
    expect(first.due).toHaveLength(1)
    expect(second.due).toHaveLength(0)
  })

  it('finished when empty', () => {
    const { spawner } = stepSpawner(createSpawner(events), 10)
    expect(isFinished(spawner)).toBe(true)
  })

  it('returns events in time order', () => {
    const { due } = stepSpawner(createSpawner(events), 5)
    expect(due.map((e) => e.kind)).toEqual(['zombie', 'flyer'])
  })
})
