# Spec: Combat resolution

- **Status:** implemented
- **Owner module(s):** `src/core/rules/combat.ts`
- **Related:** weapons.md, enemy-zombie.md, armor-damage.md

## Summary

Each step, resolve collisions between the player's projectiles and enemies, and between enemies and the
player. A projectile that hits a living enemy is consumed and damages it; an enemy overlapping the player
flags player damage. Pure function over AABBs.

## Scenarios (Given / When / Then)

### Scenario: projectile hits and kills an enemy

- **Given** one projectile overlapping a 1-HP enemy
- **When** `resolveCombat` runs
- **Then** the projectile is consumed, the enemy is dead, and `kills` is 1

### Scenario: projectile misses

- **Given** a projectile not overlapping any enemy
- **When** `resolveCombat` runs
- **Then** the projectile survives and no enemy is damaged

### Scenario: each projectile hits at most one enemy

- **Given** one projectile overlapping two enemies
- **When** `resolveCombat` runs
- **Then** exactly one enemy is damaged

### Scenario: dead enemies are not hit again

- **Given** a projectile overlapping a dead enemy and a living one
- **When** `resolveCombat` runs
- **Then** the living enemy is the one damaged

### Scenario: enemy overlapping the player flags damage

- **Given** a living enemy overlapping the player's box
- **When** `resolveCombat` runs
- **Then** `playerHit` is true

### Scenario: you can't kill what you can't see

- **Given** a projectile overlapping an enemy, but the enemy is outside the visible `view`
- **When** `resolveCombat` runs with that `view`
- **Then** the enemy is unharmed and the projectile keeps flying (passes through). With the enemy inside
  the `view`, it is hit as usual. `resolveMelee` applies the same gate. Omitting `view` disables it.

## Acceptance criteria

- [x] Consumed projectiles are removed; survivors kept in order.
- [x] Each projectile damages at most one living enemy; `kills` counts enemies that died.
- [x] `playerHit` is true iff any living enemy overlaps the player box.
- [x] When a `view` is given, the player can only damage enemies overlapping it (off-screen foes are safe).
- [x] Pure and deterministic.

## Test mapping

| Scenario     | Test file                       | Test name                                         |
| ------------ | ------------------------------- | ------------------------------------------------- |
| hit + kill   | `src/core/rules/combat.test.ts` | `combat > projectile kills enemy`                 |
| miss         | `src/core/rules/combat.test.ts` | `combat > projectile misses`                      |
| one per shot | `src/core/rules/combat.test.ts` | `combat > one enemy per projectile`               |
| skip dead    | `src/core/rules/combat.test.ts` | `combat > ignores dead enemies`                   |
| player hit   | `src/core/rules/combat.test.ts` | `combat > enemy hits player`                      |
| view gate    | `src/core/rules/combat.test.ts` | `combat > does NOT hit an enemy outside the view` |
