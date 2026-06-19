# Spec: Chests & pickups

- **Status:** implemented
- **Owner module(s):** `src/core/level/chest.ts`
- **Related:** GDD §3 (weapons swapped via chests), `weapons.md`, `armor-damage.md`, `scoring-lives.md`

## Summary

Chests are static items placed in a level. The knight opens a chest by touching it; opening it once
yields a reward and consumes the chest (it never re-triggers). Rewards: swap to a specific weapon,
restore armor, score points, an extra life, or a **curse** that downgrades the player back to the lance.
Pure core: opening is decided by AABB overlap; the engine applies each reward's effect.

## Scenarios (Given / When / Then)

### Scenario: touching a chest opens it and yields its reward

- **Given** an unopened chest and the player overlapping it
- **When** `openChests(playerBox, chests)` runs
- **Then** the chest is marked `opened` and its reward is returned

### Scenario: an opened chest does not re-trigger

- **Given** a chest already `opened`
- **When** the player overlaps it again
- **Then** no reward is returned and the chest stays opened

### Scenario: a chest the player is not touching stays closed

- **Given** an unopened chest the player does not overlap
- **When** `openChests` runs
- **Then** the chest stays closed and no reward is returned

### Scenario: only overlapping chests open

- **Given** several chests, the player overlapping exactly one
- **When** `openChests` runs
- **Then** only that chest opens and exactly one reward is returned

## Acceptance criteria

- [x] `openChests` returns the updated chest list and the rewards of newly-opened chests only.
- [x] Opening is idempotent: an opened chest never yields a reward again.
- [x] Reward kinds: `weapon` (by id), `armor`, `points`, `life`, `curse`.
- [x] Pure and deterministic (overlap-driven, no globals, no wall-clock time).

## Test mapping

| Scenario     | Test file                      | Test name                           |
| ------------ | ------------------------------ | ----------------------------------- |
| opens        | `src/core/level/chest.test.ts` | `chest > opens on overlap`          |
| idempotent   | `src/core/level/chest.test.ts` | `chest > opened does not retrigger` |
| not touching | `src/core/level/chest.test.ts` | `chest > stays closed when apart`   |
| only overlap | `src/core/level/chest.test.ts` | `chest > only overlapping opens`    |
