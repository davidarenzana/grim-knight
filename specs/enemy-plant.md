# Spec: Enemy — Plant (stationary ranged)

- **Status:** implemented
- **Owner module(s):** `src/core/enemies/plant.ts`, `src/core/rules/combat.ts`
- **Related:** enemy-zombie.md, weapons.md, combat.md, GDD §4

## Summary

The plant does not move. It periodically spits a projectile toward the player. Those enemy projectiles
damage the player on contact. It has 2 HP. Firing cadence derives from `age`, so the step stays pure.

## Scenarios (Given / When / Then)

### Scenario: stays put

- **Given** a plant
- **When** stepped
- **Then** its position does not change

### Scenario: fires after the interval

- **Given** a plant and a player to its left
- **When** `age` crosses a multiple of `fireInterval`
- **Then** it fires one projectile moving left toward the player

### Scenario: enemy projectile hits the player

- **Given** a plant projectile overlapping the player box
- **When** `resolveEnemyProjectiles` runs
- **Then** the player is flagged hit and the projectile is consumed

### Scenario: tougher than a zombie

- **Given** a plant
- **When** hit twice
- **Then** it dies

## Acceptance criteria

- [x] Plant never moves; fires once per `fireInterval` toward the player's side.
- [x] `resolveEnemyProjectiles` flags player damage and consumes the hitting projectile.
- [x] 2 HP; pure and deterministic.

## Test mapping

| Scenario   | Test file                        | Test name                                |
| ---------- | -------------------------------- | ---------------------------------------- |
| stays put  | `src/core/enemies/plant.test.ts` | `plant > starts active and stationary`   |
| fires      | `src/core/enemies/plant.test.ts` | `plant > fires ... after the interval`   |
| 2 hits     | `src/core/enemies/plant.test.ts` | `plant > takes two hits to die`          |
| player hit | `src/core/rules/combat.test.ts`  | `resolveEnemyProjectiles > ... hits ...` |
