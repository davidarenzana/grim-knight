import { describe, expect, it } from 'vitest'
import { graveyard } from './graveyard'
import { hauntedForest } from './haunted-forest'
import { swampCaverns } from './swamp-caverns'
import { ironFortress } from './iron-fortress'
import { frozenSpires } from './frozen-spires'
import { demonKeep } from './demon-keep'
import { STAGES } from './index'
import { LEVELS } from '../level'

/** Each stage module owns one self-contained, well-formed LevelDef. */
const expected = [
  { stage: graveyard, name: 'Graveyard', theme: 'ruins' },
  { stage: hauntedForest, name: 'Haunted Forest', theme: 'forest' },
  { stage: swampCaverns, name: 'Swamp Caverns', theme: 'cave' },
  { stage: ironFortress, name: 'Iron Fortress', theme: 'castle' },
  { stage: frozenSpires, name: 'Frozen Spires', theme: 'ice' },
  { stage: demonKeep, name: 'Demon Keep', theme: 'hell' },
] as const

describe('stage modules', () => {
  it('each exports its expected name + theme', () => {
    for (const { stage, name, theme } of expected) {
      expect({ name: stage.name, theme: stage.theme }).toEqual({ name, theme })
    }
  })

  it('each is a playable LevelDef (boss present, start in bounds, ground present)', () => {
    for (const { stage } of expected) {
      expect(stage.spawns.some((s) => s.kind === 'boss')).toBe(true)
      expect(stage.playerStart.x).toBeLessThan(stage.worldWidth)
      expect(stage.solids.length).toBeGreaterThan(0)
    }
  })

  it('STAGES and LEVELS expose the six stages in the same order', () => {
    const order = expected.map((e) => e.stage)
    expect(STAGES).toEqual(order)
    expect(LEVELS).toEqual(order)
  })
})
