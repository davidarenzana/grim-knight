# Grim Knight

A 2D arcade action-platformer inspired by the 90s classics (Ghosts'n Goblins and similar).
**Original IP** — no Capcom assets or names. Built with a pure-TS, fully testable game core,
**Phaser 3** for rendering/input/audio, and **Vue 3** for menus and HUD.

> Project language is **English** (code, docs, specs, UI). Development follows **SDD + TDD**.

## Play & links

- 🎮 **Live demo:** <https://grim-knight.vercel.app/>
- 🖼️ **Slides (presentation):** [Google Slides](https://docs.google.com/presentation/d/1r_BM-OV1oJ5tKKbqUrzC_nWrWvQz8jUW/edit?usp=sharing)
- 🎬 **Video walkthrough:** <!-- TODO: public video URL --> _(coming soon)_
- 💻 **Source code:** <https://github.com/davidarenzana/grim-knight>
- 🔐 **Login:** none — the game requires no authentication, so there is no test user/password.

> This project is the deliverable for a Master's final project (TFM). The documentation, deployment
> info, slides and video links above all live in this repository, as required.

## Stack

- **TypeScript** (strict, incl. `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes`) everywhere.
- **Phaser 3** — rendering, input, audio, presentation game loop.
- **Vue 3** (`<script setup>`, Composition API) — title/stage-select menus, HUD, overlays.
- **Pinia** (UI state) + **mitt** event bus (`src/shared/events.ts`) — decoupled UI ↔ game bridge.
- Pure-TS logic core (`src/core/`) — physics, collisions, FSM, rules, AI; no engine/UI deps, fully unit-tested.
- **Vitest** (unit + headless integration + Vue component tests) · **Playwright** (E2E + visual regression, `e2e/`).
- **ESLint + Prettier** (lint/format) · **Husky + lint-staged + commitlint** (git hooks).
- **Vite** (dev server + build) · **pnpm** (package manager).

## Quick start

```bash
pnpm install
pnpm dev          # run the game (Vite dev server)
pnpm test         # run the unit + component tests (Vitest)
pnpm test:cov     # same, with coverage (core thresholds enforced)
pnpm test:e2e     # E2E + visual regression (Playwright — builds, then drives a real browser)
pnpm typecheck    # vue-tsc
pnpm lint         # ESLint
pnpm build        # production build
```

> **Playwright E2E (`pnpm test:e2e`):** the first run needs the browser binary —
> `pnpm exec playwright install chromium`. The config (`playwright.config.ts`) boots the production
> build itself (`pnpm build && pnpm preview`), so you don't need a dev server running. Visual baselines
> live in `e2e/*-snapshots/` and are OS-specific; regenerate them with `pnpm test:e2e:update` after an
> intentional visual change (run on a matching OS or in CI).

## Controls

NES-style: move with the right hand, act with the left.

| Key           | Action                          |
| ------------- | ------------------------------- |
| Arrows / WASD | Move                            |
| Up / W        | Jump (climb up on a ladder)     |
| Down / S      | Crouch (climb down on a ladder) |
| Z (or Space)  | Throw the active weapon         |
| X             | Swap to the next weapon         |

A title screen (START / SELECT STAGE) and a stage-select screen front the game.

## Features

- **6 stages**, each with its own visual theme (ruins / forest / cave / castle / ice / hell), side-scrolling
  camera and a per-stage **countdown timer** (running out costs a life).
- **Player model** — walk, jump (near-fixed arc), crouch, ladder climbing; a **2-hit armor** system
  (`armored → underwear → dead`) with i-frames, knockback and armor pickups.
- **Weapons** (one active, swapped via chests/drops) — **dagger, torch** (starting kit), **lance, axe**,
  plus a magician **curse** chest that can downgrade you. Each weapon changes range, arc and fire rate.
- **Enemies** — zombie, flyer (demon), plant (ranged), ogre, centipede, armored turtle and arcing
  "bloated" caster; ground foes are **ledge-aware** (they turn at pits). Enemies fire their own projectiles.
- **Bosses** — escalating boss encounters with a dedicated **HP bar** in the HUD.
- **Endless escalating loop** — clearing stage 6 sends you around again, harder, across named difficulty
  tiers (**MORTAL → DAMNED → INFERNAL**): tougher/faster enemies, a stricter clock and a score multiplier.
- **Moving platforms** — kinematic platforms that oscillate along a segment and carry the rider.
- **Chests & item drops** — random loot, weapon swaps and the risk/reward magician curse.
- **Scoring + high-score table** — classic arcade top-ten with 3-letter initials, persisted locally.
- **Procedural audio** — Web Audio SFX and music synthesised at runtime (no audio files shipped), with an
  on-screen **on/off toggle** (preference persisted).
- **Vue HUD & overlays** — score, lives, armor, active weapon, timer, level/loop, pause and game-over/victory
  screens, all driven off the game event bus.

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

## CI/CD & deploy

- **GitHub Actions** (`.github/workflows/ci.yml`) runs on every PR and push to `main`: a `quality` job
  (typecheck + lint + test + build) and an `e2e` job (Playwright **smoke** flows; the macOS-only visual
  snapshots stay local).
- **`main` is branch-protected** — no direct pushes. Open a PR; `quality` + `e2e` must pass before merge.
- **Deploy: [Vercel](https://vercel.com/)** (Vite preset) ships production from `main`, so a red CI gate
  keeps broken code out of production. Branches/PRs get preview deploys. See AGENTS.md §11 for the flow.

## Credits / assets

Art is from free **[CraftPix.net](https://craftpix.net/)** packs, used under the CraftPix free-files
license (<https://craftpix.net/file-licenses/>; see the `CRAFTPIX-LICENSE-*.txt` files under
`public/assets/`):

- **Characters/enemies** — Warrior, Orc and Fantasy Enemies sprite packs, plus the swap-monster creatures
  (centipede, battle turtle, big bloated) and three boss skins (`public/assets/sprites/`).
- **Scenery** — per-stage themes (ruins/forest/cave/castle/ice/hell) built from the "Cartoon Medieval
  Ruins", swap-tileset, dungeons-tileset and medieval-tileset packs; backgrounds, ground/platform/ladder
  tiles, crate, chest (`public/assets/tiles/`). Each theme folder carries its source LICENSE.txt.

Thrown weapons use animated projectile sprites (`public/assets/sprites/weapons/`); only enemy shots are
drawn procedurally at runtime (rectangles). The spike/lava hazard tiles and the castle/ice backdrops were
generated offline (derived/tinted from these packs) and ship as PNGs.

## License / IP

Original work (code, design, level/enemy/boss names). Third-party art is used only under compatible
licenses (see Credits above); do not add copyrighted assets without one.
