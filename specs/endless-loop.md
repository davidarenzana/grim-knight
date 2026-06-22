# Spec: Endless loop — escalating difficulty tiers

- **Status:** in progress
- **Owner module(s):** `src/core/rules/difficulty.ts`, `src/core/app/match.ts`
- **Related:** GDD §8 (loops/scoring), session.md, AGENTS.md §8

## Summary

The campaign never ends: clearing the final stage restarts at stage 1 with a
harder loop, forever. A run ends only on game over (out of lives); the high-score
table is the reward. Difficulty is bucketed into three named tiers —
**MORTAL** (loop 1), **DAMNED** (loop 2), **INFERNAL** (loop 3+) — and keeps
escalating every loop. Clearing all stages the first time shows a celebratory
`VICTORY!` banner, but play continues into the next, harder loop.

`difficultyForLoop(loop)` is a pure function returning the tier, its display name,
and the scaling knobs applied to a run: tougher enemies (`enemyHpMul`), a shorter
stage clock (`timeScale`), and a richer payout (`scoreMul`).

## Scenarios (Given / When / Then)

### Scenario: tier names by loop

- **Given** loop numbers 1, 2, 3, 7
- **When** `difficultyForLoop(loop)` is read
- **Then** names are `MORTAL`, `DAMNED`, `INFERNAL`, `INFERNAL` and tiers are 1, 2, 3, 3

### Scenario: loop 1 is the baseline

- **Given** loop 1
- **When** `difficultyForLoop(1)` is read
- **Then** `enemyHpMul = 1`, `timeScale = 1`, `scoreMul = 1`

### Scenario: every loop ramps

- **Given** any loop `n` and the next loop `n+1`
- **When** their difficulties are compared
- **Then** `enemyHpMul` and `scoreMul` strictly increase and `timeScale` is non-increasing

### Scenario: time pressure has a floor

- **Given** a very deep loop (e.g. 50)
- **When** `difficultyForLoop` is read
- **Then** `timeScale` never drops below `0.55`

### Scenario: tougher enemies on deeper loops

- **Given** a stage run in a higher loop
- **When** an enemy spawns
- **Then** its `hp` (and `maxHp`) is the base value scaled by `enemyHpMul`, rounded, min 1

### Scenario: shorter clock on deeper loops

- **Given** a stage built for loop `n > 1`
- **When** the match config is created
- **Then** `stageSeconds` equals `round(level.durationSeconds * timeScale)`

### Scenario: richer payout on deeper loops

- **Given** a kill in loop `n`
- **When** score is awarded
- **Then** the points are `round(SCORE_PER_KILL * scoreMul)` per kill

### Scenario: endless advance, no terminal win

- **Given** the final stage of any loop is cleared
- **When** the campaign advances
- **Then** it restarts at stage 1, loop `n+1`; the run only ends on game over

## Acceptance criteria

- [ ] `difficultyForLoop` maps loops 1/2/3+ to MORTAL/DAMNED/INFERNAL.
- [ ] Loop 1 is the unscaled baseline (all muls = 1, timeScale = 1).
- [ ] `enemyHpMul`/`scoreMul` increase and `timeScale` decreases with the loop, floored at 0.55.
- [ ] Spawned enemies (boss included) scale HP/maxHp by `enemyHpMul`; the boss HP bar stays correct.
- [ ] Kill score scales by `scoreMul`.
- [ ] Clearing the last stage always advances to the next loop; no `won` terminal state.

## Test mapping

| Scenario        | Test file                           | Test name                                  |
| --------------- | ----------------------------------- | ------------------------------------------ |
| tier names      | `src/core/rules/difficulty.test.ts` | `difficulty > names tiers by loop`         |
| baseline        | `src/core/rules/difficulty.test.ts` | `difficulty > loop 1 is baseline`          |
| ramp            | `src/core/rules/difficulty.test.ts` | `difficulty > ramps every loop`            |
| time floor      | `src/core/rules/difficulty.test.ts` | `difficulty > timeScale floors`            |
| tougher enemies | `src/core/app/match.test.ts`        | `match > scales enemy hp by loop`          |
| shorter clock   | `src/core/app/match.test.ts`        | `match > shortens the clock on deep loops` |
| richer payout   | `src/core/app/match.test.ts`        | `match > scales kill score by loop`        |

## Notes / open questions

- Enemy **speed/aggression** scaling is a deliberate fast-follow (touches all enemy
  step fns); `Difficulty` leaves room for an `enemySpeedMul` knob later.
