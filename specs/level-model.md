# Spec: Level model + camera scroll

- **Status:** implemented
- **Owner module(s):** `src/core/level/level.ts`, `src/engine/scenes/GameScene.ts`
- **Related:** spawner.md, stage-timer.md, boss-cyclops.md, GDD §6

## Summary

A level is pure data (`LevelDef`): world width, player start, solids, ladders, the spawn wave and the
stage duration. Levels are wider than the screen; the camera follows the player within world bounds.
Clearing a level (wave finished + all enemies dead) advances to the next level, carrying the session
(lives/score); clearing the last level wins the game.

## Scenarios (Given / When / Then)

### Scenario: levels are scrollable

- **Given** any `LevelDef`
- **Then** its `worldWidth` is ≥ the screen width and every spawn/player-start is within bounds

### Scenario: each level ends in a boss

- **Given** any `LevelDef`
- **Then** its spawn list contains a `boss` (so it can be cleared to advance)

### Scenario: advancing levels

- **Given** the player clears a non-final level
- **When** the win condition triggers
- **Then** the scene restarts on the next level, keeping lives and score, emitting `game:level-changed`

### Scenario: clearing the final level (endless loop)

- **Given** the player clears the final level
- **Then** the campaign loops back to stage 1 at a higher difficulty tier (no terminal win); see `endless-loop.md`

## Acceptance criteria

- [x] `LevelDef` is pure data; `LEVELS` validated by `level.test.ts` (bounds, boss present).
- [x] Camera follows the player within `[0, worldWidth]`; HUD/help stay fixed (scrollFactor 0).
- [x] Level transition carries the session via `scene.restart({ levelIndex, session })`.
- [x] World-boundary walls keep the player inside the level.

## Test mapping

| Scenario     | Test file                      | Test name                              |
| ------------ | ------------------------------ | -------------------------------------- |
| scrollable   | `src/core/level/level.test.ts` | `levels > ... wider than the screen`   |
| in bounds    | `src/core/level/level.test.ts` | `levels > every spawn ... within ...`  |
| boss present | `src/core/level/level.test.ts` | `levels > each level ends with a boss` |
