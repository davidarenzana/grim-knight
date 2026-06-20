# Spec: Chests & pickups

- **Status:** implemented
- **Owner module(s):** `src/core/level/chest.ts`
- **Related:** GDD §3 (weapons swapped via chests), `weapons.md`, `armor-damage.md`, `scoring-lives.md`

## Summary

Chests are static items placed in a level. The knight opens a chest by touching it; opening it once
yields a reward and consumes the chest (it never re-triggers). Rewards: swap to a specific weapon,
restore armor, score points, an extra life, or a **curse** that downgrades the player back to the lance.
Pure core: opening is decided by AABB overlap; the engine applies each reward's effect.

**Random loot.** Levels place chests by position only (`createChest(x, y)`), which marks them
`random`. `rollReward(rng)` draws a reward from a weighted table (`REWARD_TABLE`): weapons and points
are common, armor uncommon, the curse occasional, a 1UP rare. The roll stays in pure core (seeded
`Rng`, deterministic for tests); the engine seeds an `Rng` off the wall clock per run/stage in
`create()` so a playthrough's loot is unpredictable. A chest created with an explicit reward is fixed
(`random === false`) — still supported for hand-placed loot.

**Enemy drops.** Besides chests, a slain enemy may drop a pickup: `createDrop(x, y, reward)` makes a
`Chest` flagged `drop` (collected on touch via `openChests`, rendered as the reward's bobbing icon). The
engine rolls drops with `rollReward(rng, includeCurse=false)` — `rollReward` is split into a positive
table plus the curse, so **enemy drops never hand the player a curse**. Bosses always drop; regular
enemies drop with a small chance.

**Presentation (engine).** On open/collect, the engine plays a magic-ring burst (`playEffect('magic_ring')`)
and pops the reward's **icon** out (`floatRewardIcon`): the weapon's projectile art for weapons, else a
dungeon item icon (heart=1UP, coin=points, gem=armor, purple star=curse), alongside the floating label
(shared `collectReward` for chests and drops).

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

### Scenario: a chest's reward is rolled at random

- **Given** an `Rng` seed
- **When** `rollReward(rng)` runs
- **Then** it returns a valid reward kind drawn by weight, deterministic for that seed, and every
  table entry is reachable across many rolls; weapon ids come from `CHEST_WEAPONS` and point values
  from `CHEST_POINTS`

### Scenario: chests are random unless given an explicit reward

- **Given** `createChest(x, y)` vs `createChest(x, y, reward)`
- **When** the chest is created
- **Then** the first is `random === true` (engine rolls it) and the second `random === false` (fixed)

## Acceptance criteria

- [x] `openChests` returns the updated chest list and the rewards of newly-opened chests only.
- [x] Opening is idempotent: an opened chest never yields a reward again.
- [x] Reward kinds: `weapon` (by id), `armor`, `points`, `life`, `curse`.
- [x] Pure and deterministic (overlap-driven; `rollReward` is seeded `Rng`, no globals/wall-clock in core).
- [x] `rollReward` draws from `REWARD_TABLE` by weight; all kinds reachable; ids/values from the pools.
- [x] `createChest` without a reward marks the chest `random`; the engine rolls it per run.
- [x] Engine: chest-open VFX (magic ring) + reward icon; enemy/boss death VFX (explosion).

## Test mapping

| Scenario     | Test file                      | Test name                                                                         |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------- |
| opens        | `src/core/level/chest.test.ts` | `chest > opens on overlap`                                                        |
| idempotent   | `src/core/level/chest.test.ts` | `chest > opened does not retrigger`                                               |
| not touching | `src/core/level/chest.test.ts` | `chest > stays closed when apart`                                                 |
| only overlap | `src/core/level/chest.test.ts` | `chest > only overlapping opens`                                                  |
| random/fixed | `src/core/level/chest.test.ts` | `chest > explicit reward is fixed` / `omitting the reward marks the chest random` |
| roll reward  | `src/core/level/chest.test.ts` | `rollReward > deterministic / valid kinds / pools / every entry reachable`        |
