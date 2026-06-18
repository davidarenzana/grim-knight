# Spec: Player climbing (ladders)

- **Status:** implemented
- **Owner module(s):** `src/core/fsm/player.ts`
- **Related:** player-movement.md, GDD §3, glossary

## Summary

While overlapping a ladder, the knight can climb up/down. Climbing disables gravity and moves him at a
fixed climb speed. He stays attached while on the ladder; jumping or walking off detaches him.

## Scenarios (Given / When / Then)

### Scenario: grab and climb up

- **Given** a knight overlapping a ladder
- **When** "up" is held
- **Then** state is `climb`, gravity does not pull him down, and his y decreases

### Scenario: climb down

- **Given** a knight in `climb` state on a ladder
- **When** "down" is held
- **Then** his y increases at the climb speed

### Scenario: stay attached without input

- **Given** a knight already in `climb` state on a ladder
- **When** no vertical input is given
- **Then** he stays put (state `climb`, no falling)

### Scenario: jump off the ladder

- **Given** a knight in `climb` state
- **When** "jump" is pressed
- **Then** he detaches (state `jump`) with an upward impulse

### Scenario: no ladder, no climb

- **Given** a knight not overlapping any ladder
- **When** "up" is held
- **Then** he does not enter `climb`

## Acceptance criteria

- [x] Climbing requires overlapping a ladder; gravity is disabled while climbing.
- [x] Up/down move at `CLIMB_SPEED`; no input keeps position (still attached).
- [x] Jump detaches with the normal jump impulse.

## Test mapping

| Scenario   | Test file                     | Test name                          |
| ---------- | ----------------------------- | ---------------------------------- |
| climb up   | `src/core/fsm/player.test.ts` | `player > climbs up a ladder`      |
| climb down | `src/core/fsm/player.test.ts` | `player > climbs down`             |
| stay       | `src/core/fsm/player.test.ts` | `player > stays on the ladder`     |
| jump off   | `src/core/fsm/player.test.ts` | `player > jumps off the ladder`    |
| no ladder  | `src/core/fsm/player.test.ts` | `player > no climb without ladder` |
