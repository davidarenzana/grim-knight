# ADR 0003 — One-way (semi-solid) platforms

- **Status:** accepted
- **Date:** 2026-06-18

## Context

Ladders and floating platforms conflicted: a normal solid platform blocked a climber from below, so a
ladder passing through a platform was impassable, and low jumps could not reach platforms either.

## Decision

`core/physics/body.ts` gains a `Solid = AABB & { oneWay?: boolean }` type. A `oneWay` platform:

- never blocks horizontal movement;
- only stops a body that is **falling onto it from above** (`vy > 0` and the body's pre-move bottom was
  at or above the platform top); otherwise the body passes through (jumping up, climbing up).

`stepBody` takes `readonly Solid[]`. Plain `AABB`s remain fully solid (`oneWay` undefined). Player/enemy
step functions accept `readonly Solid[]` so the flag flows through. Jump impulse was also raised to clear
a ~90px platform.

## Consequences

- (+) Ladders work through platforms; platforms are reachable by jump and landed on from above.
- (+) Backwards compatible: existing `AABB` solids behave exactly as before.
- (−) `oneWay` bodies can be entered from the side at the same height (acceptable for greybox; revisit if
  it causes clipping with future tile layouts).
