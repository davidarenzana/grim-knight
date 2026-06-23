# Spec: High road (two-lane horizontal stages)

- **Status:** implemented
- **Owner module(s):** `src/core/level/stages/{swamp-caverns,frozen-spires,demon-keep}.ts`
- **Related:** `specs/moving-platforms.md`, GDD, ADR 0003 (one-way platforms), `specs/level-model.md`

## Summary

The flat (non-tower) stages 3, 5 and 6 gain an optional elevated **"high road"** lane
running parallel to the ground at `HIGH_Y ≈ 150`. The knight chooses at a ladder near
the start: stay on the ground (safe), or climb to the high road — a chain of one-way
shelves split by un-jumpable gaps bridged by small moving platforms, patrolled by extra
ranged foes, but carrying the better chests. The high road drops back to the ground
before the boss. Both lanes share one screen (camera scrolls only horizontally), so the
fork is a visible choice. Stage 1 is left flat; the towers (2, 4) are unaffected.

This is pure level data — it reuses moving platforms (`specs/moving-platforms.md`),
one-way ledges, ladders and the generic engine rendering. No new core/engine logic.

## Scenarios (Given / When / Then)

### Scenario: the lane is a choice

- **Given** a horizontal high-road stage (3, 5, 6)
- **When** the knight reaches the ascent ladder near the start
- **Then** he may climb to the high road or continue along the ground; both lanes lead
  to the same boss

### Scenario: the high road is reachable from the ground

- **Given** a horizontal stage that has moving platforms (a high road)
- **When** its geometry is checked
- **Then** a ladder connects the ground band up to the high-road shelves (within a
  jump's rise of the topmost ledge) — no unreachable lane

### Scenario: high-road gaps are crossable

- **Given** a gap between two high-road shelves
- **When** the bridging moving platform is at either path end
- **Then** it stops within a running jump (`MAX_JUMP_GAP`) of the near shelf edge and
  never overlaps a shelf (the moving-platform reachability guardrail)

### Scenario: the descent is safe

- **Given** the knight at the end of the high road
- **When** he drops off toward the ground
- **Then** he lands on solid floor (clear of pits/hazards), losing nothing

### Scenario: risk is rewarded

- **Given** a high-road stage
- **When** its chests are placed
- **Then** at least one of the better chests sits on a high-road shelf (the ground keeps
  the rest), and extra ranged/stationary foes patrol the lane

## Acceptance criteria

- [ ] Stages 3, 5, 6 each expose a high road: shelves at `HIGH_Y`, an ascent ladder,
      moving-platform bridges, high-road foes, and ≥1 relocated chest
- [ ] Ascent guardrail (a ladder reaches the high road) passes for each
- [ ] Moving-platform reachability guardrail passes for every bridge
- [ ] No high-road spawn overlaps a solid; no hazard exceeds `SAFE_HAZARD_W`
- [ ] Stage 1 and the towers (2, 4) are unchanged
- [ ] typecheck, lint and the full test suite stay green

## Test mapping

| Scenario                    | Test file                              | Test name                                                         |
| --------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| reachable from the ground   | `src/core/level/stages/stages.test.ts` | `a horizontal high road is reachable by ladder from the ground`   |
| gaps crossable / no overlap | `src/core/level/stages/stages.test.ts` | `every moving platform can be boarded and left at both path ends` |
| spawns valid                | `src/core/level/stages/stages.test.ts` | `no ground-enemy spawn overlaps a solid crate/pillar`             |
| hazards jumpable            | `src/core/level/jumpable.test.ts`      | `"<stage>" has no un-jumpable hazard`                             |

## Notes / open questions

- High-road foes are ranged/stationary (`plant`, `turtle`) so they don't camp a bridge
  landing (the ladder-camp failure class) and threaten along the lane, not the ground
  player below. A flyer harasses the shafts between shelves.
- **Lane-aware AI:** walkers and the turtle only engage the player when he shares their
  lane (vertical proximity, `onSameLane` / `SAME_LANE_BAND` in `enemies/walk.ts`).
  Off-lane (player on the other route) they ignore him and just patrol — no tracking an
  unreachable target on the far lane, and the turtle holds fire. Flyers still harass
  across lanes by design; plants fire harmlessly along their own lane.
- Descent is a free fall to the ground — no special exit geometry needed (one-screen
  layout; the drop lands on safe floor before the boss).
- Geometry changed, so Playwright visual baselines for these stages must be regenerated
  (`npm run test:e2e:update`).
