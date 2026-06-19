# Spec: Stage hazards (spikes/lava)

- **Status:** implemented
- **Owner module(s):** `src/core/rules/hazard.ts`
- **Related:** player-damage.md, armor-damage.md, level-model.md, fall-out.md

## Summary

Stages may define damaging zones (spike strips, lava pools) as AABBs. While the
player overlaps any hazard it takes a hit; the engine folds this into the normal
`damaged` input so the armor FSM applies the loss, i-frames and knockback exactly
like an enemy hit (no separate damage path). Hazards sit on solid ground — a trap
you jump over — and are distinct from pits (which are gaps → fall-out).

## Scenarios (Given / When / Then)

### Scenario: hurt on contact

- **Given** a player box overlapping a hazard AABB
- **When** checked
- **Then** the player is hit

### Scenario: safe when clear

- **Given** a player box clear of every hazard
- **When** checked
- **Then** the player is not hit

### Scenario: no hazards

- **Given** an empty hazard list
- **When** checked
- **Then** the player is not hit

### Scenario: any of several

- **Given** several hazards, one overlapping the player
- **When** checked
- **Then** the player is hit

## Acceptance criteria

- [x] `touchesHazard(playerBox, hazards)` is a pure predicate (any AABB intersect).
- [x] The engine ORs it into `damaged`; i-frames/knockback come from the armor FSM.
- [x] Hazards are rendered with the theme's hazard tile (lava in hell, else spikes).

## Test mapping

| Scenario | Test file                       | Test name                                         |
| -------- | ------------------------------- | ------------------------------------------------- |
| hit      | `src/core/rules/hazard.test.ts` | `hazard contact > is hit while overlapping`       |
| safe     | `src/core/rules/hazard.test.ts` | `hazard contact > is safe when clear`             |
| empty    | `src/core/rules/hazard.test.ts` | `hazard contact > is safe with no hazards`        |
| any      | `src/core/rules/hazard.test.ts` | `hazard contact > is hit if any one ... overlaps` |
