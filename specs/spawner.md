# Spec: Enemy spawner (proximity-triggered)

- **Status:** implemented
- **Owner module(s):** `src/core/level/spawner.ts`
- **Related:** enemy-zombie.md, GDD §6 (levels)

## Summary

A deterministic, position-triggered spawner. It holds a list of spawn events (kind, position, optional
trigger x) and, as the player advances through the world, returns the events the player has come within
`ACTIVATION_RANGE` of, so the engine can instantiate them. Because enemies don't exist until the player
nears their zone, they stay dormant instead of marching at the player from across the stage.

## Scenarios (Given / When / Then)

### Scenario: nothing wakes while the player is far away

- **Given** a spawner with an event at x=600
- **When** stepped with the player at x=0 (further than `ACTIVATION_RANGE` away)
- **Then** no events are returned and the event is still pending

### Scenario: an enemy wakes when the player approaches

- **Given** a spawner with an event at x=600
- **When** the player comes within `ACTIVATION_RANGE` to its left
- **Then** that event is returned once and removed from pending

### Scenario: events fire once

- **Given** an event already returned
- **When** stepped again (player still/closer)
- **Then** it is not returned a second time

### Scenario: triggerX overrides the spawn position

- **Given** an event at x=1500 with `triggerX=400`
- **When** the player comes within `ACTIVATION_RANGE` of x=400
- **Then** the event fires (an early ambush ahead of its spawn point)

### Scenario: finished when empty

- **Given** all events have fired
- **When** queried
- **Then** the spawner reports finished (no pending)

## Acceptance criteria

- [x] `stepSpawner` returns events whose `triggerX ?? x` is within `ACTIVATION_RANGE` of the player x, removing them from pending.
- [x] Each event fires exactly once; ordering by trigger x preserved.
- [x] `triggerX` optionally overrides the spawn `x` for the activation check.
- [x] Pure and deterministic (player x passed in; no time/`Math.random`).

## Test mapping

| Scenario | Test file                        | Test name                                                          |
| -------- | -------------------------------- | ------------------------------------------------------------------ |
| far away | `src/core/level/spawner.test.ts` | `spawner > nothing due while the player is far to the left`        |
| approach | `src/core/level/spawner.test.ts` | `spawner > an enemy wakes once the player gets within range of it` |
| once     | `src/core/level/spawner.test.ts` | `spawner > does not re-fire an enemy that already woke`            |
| triggerX | `src/core/level/spawner.test.ts` | `spawner > triggerX overrides the spawn position`                  |
| finished | `src/core/level/spawner.test.ts` | `spawner > finished once the player has passed every trigger`      |
