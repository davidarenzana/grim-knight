# ADR 0001 — Split pure core, render engine and UI

- **Status:** accepted
- **Date:** 2026-06-18

## Context

Vue is a UI/DOM framework, not a game engine; an arcade platformer at 60 fps needs canvas/WebGL
rendering. We also want serious TDD and low token usage with AI assistance.

## Decision

Three layers with one golden rule:

- `core/` — game logic in **pure TS** (physics, collisions, FSM, rules, AI). No Phaser/Vue/DOM.
- `engine/` — **Phaser 3** as the presentation and IO adapter (render, input, audio).
- `ui/` — **Vue 3** for menus, HUD and overlays.
- `shared/` — types + event bus (mitt). Layers communicate only through this.

`core/` purity is enforced with ESLint (`no-restricted-imports`).

## Consequences

- (+) ~80% of the game is testable headless, deterministically and fast.
- (+) The render engine can be swapped without touching the logic.
- (−) Requires an explicit bridge (events) and mapping core state ↔ render.
