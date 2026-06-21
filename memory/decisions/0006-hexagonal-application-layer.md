# ADR 0006 — Hexagonal application layer (stepMatch + effects as data)

- **Status:** accepted
- **Date:** 2026-06-21

## Context

The architecture already kept `src/core/` pure (domain) with `engine/` (Phaser)
and `ui/` (Vue) as adapters. But the per-tick **orchestration** — sequencing the
domain calls, win/lose/respawn transitions, scoring, pickups, soft-lock culling —
lived inside `GameScene.tick()` (a ~170-line method on a 1048-line Phaser class),
interleaved with Phaser calls (`cameras.shake`, `playEffect`, `bus.emit`). That
meant the application logic could not be tested without a browser, and indeed
most shipped bugs (soft-locks, dead-pool freeze, win condition, pickups) lived
there, invisible to the unit suite (which only measured `src/core/`). See
`docs/TESTING-PLAN.md` for the gap analysis this pairs with.

## Decision

Introduce a pure **application layer** at `src/core/app/` and make the Phaser
scene a thin adapter (hexagonal ports & adapters):

- **Use case:** `stepMatch(config, state, input, dt) → { state, effects }`
  (`core/app/match.ts`) advances one fixed step, orchestrating the domain. Plus
  `createMatch(level, opts)` for the initial state. Both pure — no Phaser/bus/DOM.
- **Ports as data** (`core/app/types.ts`): `PlayerInput` (input port);
  `Effect` = `shake | vfx | float | notify` (output port — the use case RETURNS
  the effects it wants, never calls Phaser); `GameNotification` (the
  application-owned UI-event contract); `MatchState`/`MatchConfig`/`MatchPhase`.
- **Adapter** (`engine/scenes/GameScene.ts`): `update()` reads input → `stepMatch`
  (inside the fixed-step `stepper`) → `runEffects()` interprets `Effect[]`
  (shake→camera, vfx→`playEffect`, float→reward tweens, notify→`bus.emit`); the
  `cleared` phase drives the campaign transition (`onWin`). Render-only flourishes
  the adapter can derive from state (enemy death burst, white hit-flash) stay in
  the render layer — only logic-coupled effects cross as data.
- **Airtight boundary:** ESLint forbids `src/core` from importing Phaser, Vue,
  Pinia, `mitt`, `@shared`, or DOM globals (`eslint.config.js`).
- The `mitt` bus (`shared/events.ts`) is the engine↔ui bridge port; the engine
  adapter translates the application's `GameNotification` onto it (a deliberate
  anti-corruption translation — the core can't depend on the bus contract).
- The menu→engine start-level handoff uses the Phaser game **registry** instead
  of a module-global singleton (removed `engine/session-start.ts`).

## Consequences

- (+) The whole match loop is unit-testable headlessly (`match.test.ts`) — the
  soft-lock/win/damage/pickup bug classes now have owners.
- (+) `GameScene` dropped 1048→727 lines and holds no game logic.
- (+) Domain stays framework-free and the dependency graph is acyclic/inward.
- (−) `GameNotification` mirrors much of the bus `GameEvents`; the two must be
  kept in sync by the adapter's `emitNotification` mapping (exhaustively type-
  checked, so a missing case is a compile error).
- (−) `rng` is a deterministic-but-stateful dependency threaded through
  `MatchState` (the one concession to purity); revisit if full immutability is
  wanted.
- Adapter wiring (effect interpreter, render) is not headless-testable — covered
  later by Phase C (Vue component tests) and Phase D (Playwright E2E + visual).
