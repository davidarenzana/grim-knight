# Spec: Stage timer

- **Status:** implemented
- **Owner module(s):** `src/core/level/timer.ts`
- **Related:** GDD §6 (levels have a timer), session/lives

## Summary

Each stage has a countdown. When it reaches zero it "expires" exactly once (the engine turns that into a
lost life). Pure and deterministic — time passed in via `dt`.

## Scenarios (Given / When / Then)

### Scenario: counts down

- **Given** a 60s timer
- **When** advanced by 1s
- **Then** 59s remain

### Scenario: expires once at zero

- **Given** a timer with 0.05s left
- **When** advanced by 0.1s
- **Then** it reports `expired` true and `secondsLeft` is 0

### Scenario: never goes negative or re-expires

- **Given** an already-expired timer
- **When** advanced again
- **Then** `secondsLeft` stays 0 and `expired` is false

## Acceptance criteria

- [x] `tickTimer` decrements, clamped at 0; `expired` true only on the step that reaches 0.
- [x] Pure and deterministic.

## Test mapping

| Scenario   | Test file                      | Test name                    |
| ---------- | ------------------------------ | ---------------------------- |
| counts     | `src/core/level/timer.test.ts` | `timer > counts down`        |
| expires    | `src/core/level/timer.test.ts` | `timer > expires once`       |
| no re-fire | `src/core/level/timer.test.ts` | `timer > does not re-expire` |
