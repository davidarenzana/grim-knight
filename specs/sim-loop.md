# Spec: Fixed-timestep simulation loop

- **Status:** implemented
- **Owner module(s):** `src/core/sim/loop.ts`
- **Related:** ADR 0002 (fixed timestep), architecture.md

## Summary

A deterministic stepper that consumes real frame time and advances the simulation in fixed `dt` steps,
returning an interpolation `alpha` for smooth rendering. It guards against the "spiral of death" by
capping the number of steps per frame.

## Scenarios (Given / When / Then)

### Scenario: exactly one fixed step

- **Given** a stepper with `fixedDt = 1/60`
- **When** it advances by exactly `1/60` seconds
- **Then** `step` is called once and `alpha ≈ 0`

### Scenario: partial frame accumulates

- **Given** a stepper with `fixedDt = 1/60`
- **When** it advances by `0.5 * fixedDt`
- **Then** `step` is called zero times and `alpha ≈ 0.5`

### Scenario: multiple steps with leftover

- **Given** a stepper with `fixedDt = 1/60`
- **When** it advances by `2.5 * fixedDt`
- **Then** `step` is called twice and `alpha ≈ 0.5`

### Scenario: accumulation across frames

- **Given** a stepper advanced by `0.5 * fixedDt` (no step yet)
- **When** it advances by another `0.6 * fixedDt`
- **Then** `step` is called once (the leftover carries over)

### Scenario: clamp to avoid spiral of death

- **Given** a stepper with `fixedDt = 1/60` and `maxSteps = 5`
- **When** it advances by `100 * fixedDt` (e.g. after a tab stall)
- **Then** `step` is called at most `maxSteps` times

## Acceptance criteria

- [x] Uses an accumulator; leftover time carries across `advance` calls.
- [x] Returns `alpha` in `[0, 1)`.
- [x] Never calls `step` more than `maxSteps` times in a single `advance`.
- [x] No wall-clock time inside: `advance` receives the real delta as an argument.

## Test mapping

| Scenario     | Test file                   | Test name                   |
| ------------ | --------------------------- | --------------------------- |
| one step     | `src/core/sim/loop.test.ts` | `loop > one fixed step`     |
| partial      | `src/core/sim/loop.test.ts` | `loop > partial frame`      |
| multiple     | `src/core/sim/loop.test.ts` | `loop > multiple steps`     |
| accumulation | `src/core/sim/loop.test.ts` | `loop > carries leftover`   |
| clamp        | `src/core/sim/loop.test.ts` | `loop > clamps to maxSteps` |
