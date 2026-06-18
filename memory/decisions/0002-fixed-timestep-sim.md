# ADR 0002 — Fixed-timestep simulation + render interpolation

- **Status:** accepted
- **Date:** 2026-06-18

## Context

A platformer's physics (jumps, collisions) must be stable and reproducible, independent of device fps.
Determinism is also the basis of the `core/` tests.

## Decision

`core/sim` advances the simulation with a **fixed dt** (e.g. 1/60 s) using a time accumulator.
The Phaser render **interpolates** between the previous and current state with the leftover factor
(`alpha`). `core/` knows nothing about `requestAnimationFrame` or wall-clock time: it receives the
already-sliced `dt`.

## Consequences

- (+) Stable, deterministic physics; same seed + same inputs → same result (reliable tests).
- (+) Smooth render even if the simulation runs at a fixed rate different from screen fps.
- (−) Must store previous+current state to interpolate and map both to the render.
