# Spec: Fall-out death (pits)

- **Status:** implemented
- **Owner module(s):** `src/core/rules/fall.ts`
- **Related:** scoring-lives.md, level-model.md, player-damage.md

## Summary

Stages now have gaps/pits in the ground. A body that falls into a pit keeps
dropping under gravity; once its top edge passes a `deathY` line below the
world, it has "fallen out". The engine reacts exactly like any other death:
lose a life and respawn at the stage start (or game over if no lives remain).

## Scenarios (Given / When / Then)

### Scenario: still in play above the line

- **Given** a body whose top is above `deathY`
- **When** checked
- **Then** it has not fallen out

### Scenario: must pass the line

- **Given** a body whose top sits exactly on `deathY`
- **When** checked
- **Then** it has not fallen out (the line must be passed, not just touched)

### Scenario: fallen out

- **Given** a body whose top has dropped below `deathY`
- **When** checked
- **Then** it has fallen out

### Scenario: enemy wedged under the floor (safety net)

- **Given** a ground enemy whose top edge has dropped below the ground surface
  (`groundY`) — somewhere the player can't reach it
- **When** checked with `hasSunkUnderFloor(body, groundY)`
- **Then** it is "sunk"; the engine marks such enemies (except flyers, which
  hover low legitimately) dead so a stuck enemy can never block stage-clear

## Acceptance criteria

- [x] `hasFallenOut(body, deathY)` is a pure predicate (`body.pos.y > deathY`).
- [x] The engine calls it each tick and routes a true result through the normal
      lose-a-life / respawn / game-over flow.
- [x] `hasSunkUnderFloor(body, groundY)` is a pure predicate (`body.pos.y > groundY`);
      the engine culls sunk non-flyer enemies (safety net against a stage-clear soft-lock).

## Test mapping

| Scenario | Test file                     | Test name                                            |
| -------- | ----------------------------- | ---------------------------------------------------- |
| above    | `src/core/rules/fall.test.ts` | `fall-out rule > is false while ... above`           |
| on line  | `src/core/rules/fall.test.ts` | `fall-out rule > is false exactly at the death line` |
| below    | `src/core/rules/fall.test.ts` | `fall-out rule > is true once the body drops below`  |
| sunk     | `src/core/rules/fall.test.ts` | `sunk-under-floor safety net > ...`                  |
