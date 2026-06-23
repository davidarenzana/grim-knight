# Project Plan — Grim Knight (Ghosts'n-Goblins-style action platformer)

> **Project language: everything in English** — code, comments, `AGENTS.md`, `memory/`, `docs/`,
> `specs/` and UI strings. This file is the canonical, version-controlled plan.

## Context

Greenfield project to build a 2D **arcade action-platformer** inspired by Ghosts'n Goblins. It is
developed largely with AI assistance, so the goal is not only the game but also a **project scaffold
that keeps context stable and reduces token usage**: Markdown specs (SDD), TDD on the logic, a living
`AGENTS.md`, and a `memory/` folder that agents read instead of re-scanning the whole codebase.

**Decisions already made with the user:**

- Architecture: **pure, testable TS core** + **Phaser 3** (render/input/audio) + **Vue 3** (menus/HUD/shell).
- Scope: **design the full game structure** (6 levels, enemies, bosses, double loop, scoring), but
  **implement incrementally**, starting from a greybox vertical slice.
- Assets: **greybox first** (shapes/placeholders), then CC0 art (Kenney/OpenGameArt) or original.
  **Never** use Capcom's original sprites/audio/names — this is an original "inspired by" game.
- Process: **lightweight SDD** (Given→When→Then specs) + **TDD mandatory in `core/`**, smoke tests in
  render/UI. `AGENTS.md` + `memory/*.md` kept continuously up to date. Pre-commit hooks + CI.

> IP note: the playable character, enemies, bosses and names are original (e.g. a generic "Knight"
> instead of "Arthur", original bosses instead of "Astaroth"). Specs/code use project-original names.

## Tech stack

| Layer           | Choice                                                  | Reason                                                |
| --------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Language        | TypeScript (strict)                                     | Strong typing, safe refactors                         |
| Build/dev       | **Vite**                                                | Fast HMR, first-class Vue + TS                        |
| UI shell        | **Vue 3** (`<script setup>`, Composition API)           | Menus, HUD, pause, options                            |
| Game render/IO  | **Phaser 3**                                            | Game loop, sprites, tilemaps, audio, input solved     |
| UI↔game state   | **Pinia** + event bus (mitt)                            | Decoupled bridge between Vue and the simulation       |
| Tests           | **Vitest** (+ `@vitest/coverage-v8`), Vue Test Utils    | Core unit tests, component smoke tests                |
| E2E (optional)  | Playwright                                              | Smoke of start→play→game over flow                    |
| Lint/format     | ESLint (typescript-eslint, flat config) + Prettier      | Broad standard; alt: Biome                            |
| Hooks           | Husky + lint-staged + commitlint (Conventional Commits) | Quality on every commit                               |
| CI              | GitHub Actions                                          | `quality` (typecheck+lint+test+build) + `e2e` (smoke) |
| Deploy          | Vercel (Vite preset)                                    | Production from `main`; preview per PR                |
| Package manager | **pnpm**                                                | Fast, deterministic lockfile                          |

**Assumptions** (adjustable): Node 22, pnpm, GitHub for repo/CI; Vercel for hosting. `main` is
branch-protected — PRs only, and `quality` + `e2e` must pass before merge (so production never deploys
red code). See AGENTS.md §11.

## Architecture: domain / presentation split

Golden rule: **`core/` does not import Phaser or Vue and never touches the DOM.** This lets ~80% of the
game be unit-tested with Vitest, headless and deterministically.

```
src/
  core/            # PURE TS — game logic, fully TDD-tested
    sim/           #   fixed-timestep simulation loop (~60Hz)
    math/          #   vectors, AABB, seeded RNG (deterministic)
    physics/       #   gravity, integration, AABB collision resolution
    entities/      #   entity/component model (ECS-lite / data-oriented)
    fsm/           #   state machines (player: idle/run/jump/crouch/climb/throw/hurt/die)
    rules/         #   armor (2 hits), damage, lives, scoring, timer, double loop
    weapons/       #   lance, dagger, torch, axe, shield... (data + behavior)
    enemies/       #   per-type AI (rising zombie, flying demon, plant, ogre...)
    level/         #   level model (tiles, spawns, triggers), Phaser-independent
  engine/          # ADAPTER — bridges core to Phaser (presentation + IO)
    scenes/ render/ input/ audio/ assets/
  ui/              # VUE 3 — shell over the canvas (views/, components/, stores/)
  shared/          # shared types and events (mitt bus)
  main.ts          # bootstrap: mounts Vue + instantiates Phaser in a container
```

**Fixed timestep + interpolation:** the core advances the simulation in deterministic steps (fixed dt);
Phaser render interpolates. With a seeded RNG, core tests are reproducible (same input → same result).

**UI↔game bridge:** the game emits `game:*` events on the `mitt` bus → Pinia store → Vue HUD reacts.
The UI emits `ui:*` commands back on the same bus. No direct coupling.

## SDD: spec structure

```
docs/
  PLAN.md                # this plan (canonical)
  GDD.md                 # Game Design Document: FULL game structure
specs/
  _TEMPLATE.md           # Given→When→Then template + acceptance criteria + test mapping
  player-movement.md  player-jump.md  player-climb.md
  armor-damage.md  weapons.md  enemy-zombie.md  enemy-flyer.md
  level-model.md  boss-<n>.md  scoring-lives.md  double-loop.md
```

Lightweight SDD flow: spec → failing test (TDD) → implement in `core/` → green → adapt render →
update `memory/progress.md`.

## AI context system: `AGENTS.md` + `memory/`

Explicit user goal: stable context, fewer tokens. Agents read these `.md` files instead of re-scanning code.

```
memory/
  INDEX.md            # one line per file (read first)
  architecture.md     # stable architecture decisions
  conventions.md      # naming, test layout, gotchas
  glossary.md         # domain terms
  progress.md         # done / in progress / next (updated every session)
  decisions/          # ADRs: 0001-*.md, 0002-*.md, ...
```

### "Living project" rule (mandatory continuous context maintenance)

Whenever something relevant is learned during development — a design decision, a working pattern, a
Phaser/Vue limitation, a new convention, a stack change, a physics/collision gotcha — **the memory and
`AGENTS.md` must be updated in the same change** in which it is discovered. Documentation must never lag
behind the code.

Definition of Done for any task: _code works AND memory/AGENTS.md reflect what was learned._ A task is not
done if it left documentation stale. This discipline keeps context stable and cuts token usage in future
sessions (agents read fresh memory instead of reconstructing context from code).

## Roadmap (incremental over the full structure)

- **Phase 0 — Scaffolding + process:** repo, tooling, folder structure, `AGENTS.md`, `memory/`, `docs/`,
  `specs/`, CI, hooks, hello-world (Vue menu + Phaser canvas), green smoke test.
- **Phase 1 — Engine core (pure TDD):** `core/math` (vector, AABB, seeded RNG), `core/sim` (fixed step),
  `core/physics` (gravity + AABB resolution). ADRs written.
- **Phase 2 — Player vertical slice (greybox):** player FSM (walk/jump/crouch/climb/throw), 2-hit armor,
  lance weapon. Greybox render in Phaser + keyboard input. First truly playable build.
- **Phase 3 — Enemies, level, game loop:** 2-3 enemies, spawning, one greybox level, Vue HUD, win/lose,
  game over, restart. Pinia↔Phaser bridge.
- **Phase 4 — Full structure rollout:** remaining weapons, enemies and bosses; 6 levels; double loop;
  lives/continues/scoring; audio. Parallel agents help here (one per enemy/boss/level spec).
- **Phase 5 — Art pass & juice:** integrate CC0/original assets over defined asset contracts; animations,
  particles, screen shake, transitions, music. Code unchanged, placeholders swapped.
- **Phase 6 — Build & publish:** production build, asset optimization, deploy (**Vercel**, live), README.
  - **Code-split the Phaser chunk** (the build is one ~1.6 MB / 384 kB-gzip JS bundle, ~90% Phaser). Plan:
    1. **Lazy-load Phaser** — make `GameCanvas`/`@engine/game` a dynamic `import()` (e.g. `defineAsyncComponent`)
       so the Vue **menu boots without Phaser**; the engine chunk loads on START. Biggest perceived-load win
       (the player sits on the title screen first; Phaser isn't needed until `playing`). Mask the first-START
       delay with a "Loading…" state or background-prefetch while on the menu.
    2. Optionally a `build.rollupOptions.output.manualChunks` **vendor split** (Phaser in its own chunk) for
       caching across deploys + to silence the >500 kB warning. Secondary — it doesn't defer the download.
  - Deploy: **done** — Vercel (Vite preset, `npm run build` → `dist`); gated by branch protection on `main`.

## Verification (end-to-end)

1. `pnpm install` → `pnpm typecheck` + `pnpm lint` + `pnpm test` green; `pnpm build` produces dist.
2. Every `core/` feature has a spec in `specs/` and passing Vitest tests; core coverage ≥80%.
3. `pnpm dev` → Vue menu → start game → knight moves/jumps/throws, takes damage (armor→underwear→dead),
   HUD reacts, game over + restart work.
4. Determinism: a core test with a seeded RNG yields the same result across runs.
5. CI green on every PR — `quality` (typecheck + lint + test + build) **and** `e2e` (smoke) — before merge to `main`.
6. Living docs: no task is done if it left memory/`AGENTS.md` stale.

## Parallel agents

From Phase 4 onward (patterns established), parallelize: one agent per enemy/boss/level spec, each
following spec → failing test → core → render → update `memory/progress.md`. Phases 0-3 run serially
(they define the shared foundations).
