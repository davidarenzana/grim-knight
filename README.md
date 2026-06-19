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

## Credits / assets

Art is from free **[CraftPix.net](https://craftpix.net/)** packs, used under the CraftPix free-files
license (<https://craftpix.net/file-licenses/>; see the `CRAFTPIX-LICENSE-*.txt` files under
`public/assets/`):

- **Characters/enemies** — Warrior, Orc and Fantasy Enemies sprite packs (`public/assets/sprites/`).
- **Scenery** — "Cartoon Medieval Ruins" level set: backgrounds, ground/platform/ladder tiles, crate,
  chest (`public/assets/tiles/`).

Projectiles are still drawn procedurally in code.

## License / IP

Original work (code, design, level/enemy/boss names). Third-party art is used only under compatible
licenses (see Credits above); do not add copyrighted assets without one.
