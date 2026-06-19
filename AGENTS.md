# AGENTS.md — Project operating guide (living document)

> Read me at the start of **every** session. Then read `memory/INDEX.md` and `memory/progress.md`.
> This file and the `memory/` folder exist to keep context stable and **reduce token usage**: trust
> them before re-scanning the whole codebase.
>
> **Project language: English.** All code, comments, docs, specs, memory and UI strings are in English.

## 1. Vision

2D arcade action-platformer inspired by the 90s classics (Ghosts'n Goblins and similar).
**100% original IP**: characters, enemies, bosses and names are our own. NEVER use Capcom sprites,
music or names.

## 2. Stack

- **TypeScript** (strict) everywhere.
- **Vue 3** (`<script setup>`, Composition API) → menus, HUD, shell.
- **Phaser 3** → render, input, audio, presentation game loop.
- **Pure-TS logic core** (`src/core/`) → physics, collisions, FSM, rules, AI. Testable.
- **Pinia** + **mitt** (`src/shared/events.ts`) → decoupled UI ↔ game bridge.
- **Vitest** (tests) · **ESLint + Prettier** · **Husky + lint-staged + commitlint** · **Vite** · **pnpm**.

## 3. Architectural golden rule

**`src/core/` is PURE TS: it imports neither Phaser, nor Vue, nor Pinia, and never touches the DOM.**
Enforced by ESLint (`no-restricted-imports` in `eslint.config.js`). If you need data from the outside,
pass it as arguments; if you need to talk to the UI, do it via bus events.

```
src/
  core/     pure TS · game logic · TDD mandatory
    math/ sim/ physics/ entities/ fsm/ rules/ weapons/ enemies/ level/
  engine/   Phaser adapter (renders core state + input + audio)
    scenes/ render/ input/ audio/ assets/
  ui/       Vue 3 (views/, components/, stores/)
  shared/   shared types and events (mitt bus)
```

## 4. Commands

| Action           | Command                       |
| ---------------- | ----------------------------- |
| Dev server       | `pnpm dev`                    |
| Tests (once)     | `pnpm test`                   |
| Tests (watch)    | `pnpm test:watch`             |
| Coverage         | `pnpm test:cov`               |
| Typecheck        | `pnpm typecheck`              |
| Lint             | `pnpm lint` / `pnpm lint:fix` |
| Format           | `pnpm format`                 |
| Production build | `pnpm build`                  |

## 5. SDD + TDD flow (mandatory)

1. **Spec** — write/update `specs/<feature>.md` with `Given / When / Then` scenarios.
2. **Red test** — write the `core/` test (`*.test.ts`) that encodes the spec and fails.
3. **Implement** — the minimum in `core/` to go green.
4. **Refactor** — clean up with tests green.
5. **Render** — adapt `engine/` (Phaser) and/or `ui/` (Vue) to show the new behavior.
6. **Document** — update memory (see §6). The task is NOT done until this step.

TDD is **mandatory in `core/`**. In `engine/`/`ui/` smoke tests are enough.

## 6. Living project: ALWAYS update memory

**Non-negotiable requirement.** Any relevant learning is documented in the same change in which it is
discovered. Documentation must never lag behind the code.

| You learned...                    | Update...                                                            |
| --------------------------------- | -------------------------------------------------------------------- |
| An architecture/design decision   | new ADR in `memory/decisions/` (+ this guide if it is a global rule) |
| A domain term or mechanic         | `memory/glossary.md`                                                 |
| A code/test convention            | `memory/conventions.md`                                              |
| A Phaser/Vue/physics gotcha       | `memory/conventions.md` or the relevant ADR                          |
| A stack/commands/structure change | this `AGENTS.md`                                                     |
| What was done / what is next      | `memory/progress.md`                                                 |

And **always** keep `memory/INDEX.md` in sync (one line per memory file).

**Definition of Done:** code works, tests pass, lint/typecheck green, and memory/AGENTS.md reflect what
was learned.

## 7. Quick conventions

- Commits: **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
- Test files next to the code: `file.test.ts`. DOM tests opt into jsdom with a `// @vitest-environment jsdom` docblock (default env is `node`).
- No `Math.random()` in `core/`: use `createRng(seed)` (reproducible determinism).
- Import aliases: `@core/*`, `@engine/*`, `@ui/*`, `@shared/*`, `@/*`.

## 8. Current status

Phases 0–4 done; Phase 5 started. Feature-complete greybox: 6 stages × 2 loops (double quest) with camera
scroll. Player FSM (idle/run/jump/crouch/climb/throw/hurt/die + air control), 2-hit armor; enemies
zombie/flyer/ogre/plant and a boss (HP bar); enemy projectiles, projectile-vs-wall collision, timed spawner,
stage timer, lives/score/game-over, level transitions and the double loop → "True Victory". **Weapon variety**
(lance/dagger/torch/axe with arc + limited-reach), Q to swap. **Chests/pickups** (weapon/armor/points/life/curse)
across all 6 levels (chests show floating reward text; stage-clear banner). **Juice**: screen shake, enemy
hit-flash, i-frame blink. **Art**: characters/enemies/boss are **CraftPix animated spritesheets** (`engine/assets/sprites.ts`, loaded
in `preload()`); scenery (background, ground/platform/ladder, crate, chest) is the CraftPix "Cartoon Medieval
Ruins" tileset (`engine/assets/tiles.ts`); only projectiles stay procedural (rectangles). All wired into
`GameScene` and the Vue HUD via the bus. 138 tests green. Next within Phase 5: audio, fine-tune sprite scales;
then Phase 6 (build/deploy). Live detail in `memory/progress.md`.

## 9. Parallel agents

From Phase 4 onward (patterns established), parallelize: one agent per enemy/boss/level spec following
the §5 flow. In Phases 0-3 work serially (shared foundations).

## 10. Reference docs

- `docs/PLAN.md` — canonical project plan and roadmap.
- `docs/GDD.md` — full Game Design Document (levels, enemies, bosses, weapons, scoring).
