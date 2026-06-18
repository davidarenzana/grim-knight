# Spec: Session — lives, score, game over

- **Status:** implemented
- **Owner module(s):** `src/core/rules/session.ts`
- **Related:** GDD §8 (scoring), combat.md

## Summary

Tracks the arcade session: remaining lives, score and high-level state. Losing the last life ends the
game; finishing the run wins it.

## Scenarios (Given / When / Then)

### Scenario: fresh session

- **Given** a new session
- **When** created
- **Then** lives = `STARTING_LIVES`, score = 0, state = `playing`

### Scenario: scoring

- **Given** a playing session
- **When** `addScore(n)` is applied
- **Then** the score increases by `n`

### Scenario: losing a life

- **Given** a session with 2 lives
- **When** `loseLife` is applied
- **Then** lives = 1 and state stays `playing`

### Scenario: game over on the last life

- **Given** a session with 1 life
- **When** `loseLife` is applied
- **Then** lives = 0 and state = `gameover`

### Scenario: scoring is ignored after game over

- **Given** a session in `gameover`
- **When** `addScore(n)` is applied
- **Then** the score does not change

## Acceptance criteria

- [x] `createSession` starts at `STARTING_LIVES` lives, 0 score, `playing`.
- [x] `loseLife` decrements; reaching 0 sets `gameover`.
- [x] `addScore`/`loseLife` are no-ops once not `playing`.
- [x] `win` sets state `won`. Pure and deterministic.

## Test mapping

| Scenario  | Test file                        | Test name                       |
| --------- | -------------------------------- | ------------------------------- |
| fresh     | `src/core/rules/session.test.ts` | `session > starts fresh`        |
| scoring   | `src/core/rules/session.test.ts` | `session > adds score`          |
| lose life | `src/core/rules/session.test.ts` | `session > loses a life`        |
| game over | `src/core/rules/session.test.ts` | `session > game over on last`   |
| frozen    | `src/core/rules/session.test.ts` | `session > no score after over` |
