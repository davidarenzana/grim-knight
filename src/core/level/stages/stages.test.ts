import { describe, expect, it } from 'vitest'
import { graveyard } from './graveyard'
import { hauntedForest } from './haunted-forest'
import { swampCaverns } from './swamp-caverns'
import { ironFortress } from './iron-fortress'
import { frozenSpires } from './frozen-spires'
import { demonKeep } from './demon-keep'
import { STAGES } from './index'
import { LEVELS } from '../level'
import {
  createZombie,
  createOgre,
  createPlant,
  createBoss,
  createCentipede,
  createTurtle,
  createBloated,
  type Enemy,
  type EnemyKind,
} from '@core/enemies'

/** Spawn a ground enemy as the engine would, to get its resting body box. */
const spawnGround = (kind: Exclude<EnemyKind, 'flyer'>, x: number, y: number): Enemy => {
  switch (kind) {
    case 'zombie':
      return createZombie(x, y)
    case 'ogre':
      return createOgre(x, y)
    case 'plant':
      return createPlant(x, y)
    case 'boss':
      return createBoss(x, y, 1)
    case 'centipede':
      return createCentipede(x, y)
    case 'turtle':
      return createTurtle(x, y)
    case 'bloated':
      return createBloated(x, y)
  }
}

const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

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

  it('no ground-enemy spawn overlaps a solid crate/pillar', () => {
    // A walker spawned inside a crate/pillar gets stranded on top of it where
    // ground throws can't reach → it blocks stage-clear. Guard against it.
    for (const { stage } of expected) {
      const blockers = stage.solids.filter((s) => !s.oneWay)
      for (const ev of stage.spawns) {
        if (ev.kind === 'flyer') continue
        const e = spawnGround(ev.kind, ev.x, ev.y)
        const box = { x: e.body.pos.x, y: e.body.pos.y, w: e.body.w, h: e.body.h }
        for (const s of blockers) {
          expect(
            overlaps(box, s),
            `${stage.name}: ${ev.kind}@${ev.x} overlaps a solid at x=${s.x}`,
          ).toBe(false)
        }
      }
    }
  })

  it('STAGES and LEVELS expose the six stages in the same order', () => {
    const order = expected.map((e) => e.stage)
    expect(STAGES).toEqual(order)
    expect(LEVELS).toEqual(order)
  })
})
