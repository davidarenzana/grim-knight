# Arcade Knight

A 2D arcade action-platformer inspired by the 90s classics (Ghosts'n Goblins and similar).
**Original IP** — no Capcom assets or names. Built with a pure-TS, fully testable game core,
**Phaser 3** for rendering/input/audio, and **Vue 3** for menus and HUD.

> Project language is **English** (code, docs, specs, UI). Development follows **SDD + TDD**.

## Quick start

```bash
pnpm install
pnpm dev          # run the game (Vite dev server)
pnpm test         # run the unit tests (Vitest)
pnpm typecheck    # vue-tsc
pnpm lint         # ESLint
pnpm build        # production build
```

## Architecture

Three layers with one golden rule — **`src/core/` is pure TS** (no Phaser/Vue/DOM), so ~80% of the
game is testable headless and deterministically.

```
src/core/     pure game logic (physics, collisions, FSM, rules, AI) — TDD
src/engine/   Phaser adapter (renders core state, input, audio)
src/ui/       Vue 3 shell (menus, HUD, overlays)
src/shared/   shared types + event bus (mitt)
```

## Docs & process

- `AGENTS.md` — operating guide for humans and AI agents (read first).
- `docs/PLAN.md` — canonical plan and roadmap.
- `docs/GDD.md` — full Game Design Document.
- `specs/` — feature specs (Given/When/Then), the SDD source of truth.
- `memory/` — living context for AI sessions (architecture, conventions, glossary, progress, ADRs).

## License / IP

Original work. Do not add third-party copyrighted assets without a compatible license.
