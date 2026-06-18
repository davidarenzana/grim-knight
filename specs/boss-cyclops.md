# Spec: Boss 1 — Cyclops Sentinel

- **Status:** implemented (greybox behavior; art/phases later)
- **Owner module(s):** `src/core/enemies/boss.ts`
- **Related:** GDD §5 (bosses), enemy-plant.md, combat.md

## Summary

The first boss is a tough walker that advances on the player and fires a three-way projectile spread on a
cadence. It has high HP; clearing it (and the rest of the wave) wins the stage. Its HP is shown as a bar
in the HUD.

## Scenarios (Given / When / Then)

### Scenario: advances on the player

- **Given** a boss with the player to its left
- **When** stepped
- **Then** it faces and moves left

### Scenario: three-way volley on cadence

- **Given** a boss
- **When** `age` crosses a multiple of `fireInterval`
- **Then** it fires three projectiles (up / straight / down) toward the player

### Scenario: tanky

- **Given** a boss
- **When** hit `BOSS.hp` times
- **Then** it dies

## Acceptance criteria

- [x] Walks toward the player under gravity/solids; fires a 3-way spread on cadence.
- [x] High HP (>5); dies after `BOSS.hp` hits.
- [x] Engine emits `game:boss-hp` for the HUD bar and `game:boss-cleared` once on death.
- [x] Pure and deterministic.

## Test mapping

| Scenario | Test file                       | Test name                             |
| -------- | ------------------------------- | ------------------------------------- |
| advances | `src/core/enemies/boss.test.ts` | `boss > advances toward the player`   |
| volley   | `src/core/enemies/boss.test.ts` | `boss > fires a three-way spread ...` |
| tanky    | `src/core/enemies/boss.test.ts` | `boss > is tanky (many hits to kill)` |
