# Spec: Enemy — Zombie (rising walker)

- **Status:** implemented
- **Owner module(s):** `src/core/enemies/zombie.ts`
- **Related:** GDD §4 (enemies), physics/body, combat.md

## Summary

The zombie rises from the ground, then walks toward the player at a slow, constant speed, falling under
gravity and colliding with solids. It has low HP and dies when its HP reaches zero.

## Scenarios (Given / When / Then)

### Scenario: rises before walking

- **Given** a freshly spawned zombie (state `rising`)
- **When** less than `riseSeconds` has elapsed
- **Then** it stays in `rising` and does not move horizontally

### Scenario: starts walking after rising

- **Given** a rising zombie
- **When** `riseSeconds` has elapsed
- **Then** its state becomes `walking`

### Scenario: walks toward the player

- **Given** a walking zombie with the player to its left
- **When** stepped
- **Then** it moves left (negative x velocity) and faces left

### Scenario: takes a hit and dies

- **Given** a zombie with 1 HP
- **When** `hitEnemy` is applied
- **Then** its HP reaches 0 and its state becomes `dead`

### Scenario: dead zombies do not move

- **Given** a dead zombie
- **When** stepped
- **Then** its position does not change

## Acceptance criteria

- [x] `rising` → `walking` after `riseSeconds`; no horizontal move while rising.
- [x] Walking moves toward the target x at `speed`, sets `facing`, obeys gravity/solids.
- [x] `hitEnemy` reduces HP; HP ≤ 0 → `dead`.
- [x] Pure and deterministic.

## Test mapping

| Scenario      | Test file                         | Test name                       |
| ------------- | --------------------------------- | ------------------------------- |
| rising        | `src/core/enemies/zombie.test.ts` | `zombie > stays rising briefly` |
| start walking | `src/core/enemies/zombie.test.ts` | `zombie > walks after rising`   |
| toward player | `src/core/enemies/zombie.test.ts` | `zombie > walks toward player`  |
| dies          | `src/core/enemies/zombie.test.ts` | `zombie > dies when HP hits 0`  |
| dead static   | `src/core/enemies/zombie.test.ts` | `zombie > dead does not move`   |
