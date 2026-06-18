# Spec: Enemy spawner (timed waves)

- **Status:** implemented
- **Owner module(s):** `src/core/level/spawner.ts`
- **Related:** enemy-zombie.md, GDD §6 (levels)

## Summary

A deterministic, time-scheduled spawner. It holds a list of spawn events (time, kind, position) and, as
time advances, returns the events that have come due so the engine can instantiate the enemies.

## Scenarios (Given / When / Then)

### Scenario: nothing due before its time

- **Given** a spawner with an event at t=1.0s
- **When** advanced by 0.5s
- **Then** no events are returned and the event is still pending

### Scenario: an event comes due

- **Given** a spawner with an event at t=1.0s
- **When** advanced past 1.0s total
- **Then** that event is returned once and removed from pending

### Scenario: events fire once

- **Given** an event already returned
- **When** advanced again
- **Then** it is not returned a second time

### Scenario: finished when empty

- **Given** all events have fired
- **When** queried
- **Then** the spawner reports finished (no pending)

## Acceptance criteria

- [x] `stepSpawner` returns events with `at <= elapsed`, removing them from pending.
- [x] Each event fires exactly once; ordering by time preserved.
- [x] Pure and deterministic (time passed in via `dt`).

## Test mapping

| Scenario | Test file                        | Test name                       |
| -------- | -------------------------------- | ------------------------------- |
| not yet  | `src/core/level/spawner.test.ts` | `spawner > nothing due early`   |
| due      | `src/core/level/spawner.test.ts` | `spawner > event comes due`     |
| once     | `src/core/level/spawner.test.ts` | `spawner > fires once`          |
| finished | `src/core/level/spawner.test.ts` | `spawner > finished when empty` |
