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
- **Vitest** (unit + headless integration + Vue component) · **Playwright** (E2E + visual regression, `e2e/`).
- **ESLint + Prettier** · **Husky + lint-staged + commitlint** · **Vite** · **pnpm**.

## 3. Architectural golden rule

**`src/core/` is PURE TS: it imports neither Phaser, Vue, Pinia, the `mitt` bus nor `@shared`, and
never touches the DOM.** Enforced by ESLint (`no-restricted-imports` + `no-restricted-globals` in
`eslint.config.js`). If you need data from the outside, pass it as arguments; if you need to talk to the
UI, **return effects/notifications as data** (see `core/app`) — the adapter, not the core, calls the bus.

We follow a **hexagonal (ports & adapters)** layout: `core/` is the domain + application (the `stepMatch`
use case in `core/app`); `engine/` and `ui/` are adapters; nothing points out of the core (verified
acyclic). The application returns presentation **effects as data**; the adapter interprets them. See ADR
[[0006-hexagonal-application-layer]].

```
src/
  core/     pure TS · domain + application · TDD mandatory
    math/ sim/ physics/ fsm/ rules/ weapons/ enemies/ level/
    app/    application layer (use cases + ports): types (MatchState, Effect output port), the
            stepMatch/createMatch orchestrator (match.ts), its helpers (spawn/rewards/lifecycle/
            effects) and all gameplay+emitted-presentation constants (tuning.ts)
  engine/   Phaser DRIVEN adapter (renders core state + interprets effects + keyboard input + audio)
    scenes/  GameScene (thin orchestrator) · audio.ts
    input/   keymap (keys → core PlayerInput port)
    render/  WorldRenderer (sprite pools) + sprites/theme (presentation constants)
    assets/  sprite/tile/effect loaders
  ui/       Vue 3 DRIVING adapter (views/, components/, stores/); color tokens in style.css :root
  shared/   port contract: the `mitt` event bus that bridges engine ↔ ui
```

## 4. Commands

| Action               | Command                       |
| -------------------- | ----------------------------- |
| Dev server           | `pnpm dev`                    |
| Tests (once)         | `pnpm test`                   |
| Tests (watch)        | `pnpm test:watch`             |
| Coverage             | `pnpm test:cov`               |
| E2E + visual         | `pnpm test:e2e`               |
| Update E2E baselines | `pnpm test:e2e:update`        |
| Typecheck            | `pnpm typecheck`              |
| Lint                 | `pnpm lint` / `pnpm lint:fix` |
| Format               | `pnpm format`                 |
| Production build     | `pnpm build`                  |

> **First E2E run:** install the browser binary once with `pnpm exec playwright install chromium`.
> `pnpm test:e2e` builds + serves the app itself (`playwright.config.ts` → `webServer`), so no dev server
> is needed. Visual baselines (`e2e/*-snapshots/`) are OS-specific — `pnpm test:e2e:update` to regenerate.
> CI runs **only the smoke flows** (`e2e/smoke.spec.ts`); the macOS-only visual snapshots stay local.

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

- Commits: **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `build:`, `ci:`).
- Test files next to the code: `file.test.ts`. DOM tests opt into jsdom with a `// @vitest-environment jsdom` docblock (default env is `node`).
- No `Math.random()` in `core/`: use `createRng(seed)` (reproducible determinism).
- Import aliases: `@core/*`, `@engine/*`, `@ui/*`, `@shared/*`, `@/*`.

## 8. Current status

Phases 0–5 done; Phase 6 (build/deploy) next. Feature-complete greybox: 6 stages on an endless escalating loop with camera
scroll. Player FSM (idle/run/jump/crouch/climb/throw/hurt/die + air control), 2-hit armor; enemies
zombie/flyer/ogre/plant and a boss (HP bar); enemy projectiles, projectile-vs-wall collision,
**proximity-triggered spawner** (enemies wake as you approach their zone, not on a timer — so the boss no
longer marches at you from across the stage if you stand still), long horizontally-scrolling stages,
stage timer, lives/score/game-over, level transitions and an **endless escalating loop** (3 named difficulty
tiers MORTAL/DAMNED/INFERNAL — `src/core/rules/difficulty.ts`; clearing stage 6 loops back harder, forever;
a run ends only on game over). **Weapon variety**
(lance/dagger/torch/axe with arc + limited-reach). **Controls are NES-style**: arrows (or WASD) move, **Z (or Space)
throws**, **X swaps weapon**. **Front-end menus** (Vue, `src/ui/views/`): a title screen (START / SELECT STAGE,
backdrop + boss art) and a stage-select screen gate the game; the store's `Screen` (menu/levels/playing/paused/
gameover/enterscore/highscores) drives which view shows. **Chests/pickups** (weapon/armor/points/life/curse)
across all 6 levels (chests show floating reward text; stage-clear banner). **Juice**: screen shake, enemy
hit-flash, i-frame blink. **Art**: characters/enemies/boss are **CraftPix animated spritesheets** (`engine/assets/sprites.ts`, loaded
in `preload()`); scenery (background, ground/platform/ladder, crate, chest) is the CraftPix "Cartoon Medieval
Ruins" tileset (`engine/assets/tiles.ts`); thrown weapons use animated projectile sprites (spear/dagger/torch/axe, `public/assets/sprites/weapons/`), only enemy shots stay procedural rectangles. All wired into
`GameScene` and the Vue HUD via the bus. **Per-level themes** (ruins/forest/cave/castle/ice/hell) give every
stage its own ground tile + backdrop (`engine/assets/tiles.ts`; theme art under `public/assets/tiles/<theme>/`).
**Three more enemies** (centipede/turtle/bloated) and **three escalating boss variants** (one skin per pair of
stages). **GnG-style level geometry**: jumpable pits (`floor(width, pits)`) with **fall-out** death (`core/rules/fall.ts`)
and **contact hazards** (spikes/lava, `core/rules/hazard.ts`; `lava(x,w)` is a recessed-into-the-ground pool, sized
so a jump clears it). A **jumpable-hazard guardrail** (`level/jumpable.test.ts`) asserts every authored hazard stays
within `SAFE_HAZARD_W` (< `MAX_JUMP_GAP`) so no stage soft-locks. **Haunted Forest (stage 2) and Iron Fortress
(stage 4) are vertical tower stages** (tall `worldHeight`, vertical camera scroll; knight climbs a zig-zag of
one-way shelves + alternating ladders, enemies gated by `triggerY`; shared `rungs` helper in `level/geometry.ts`).
Ground enemies are **ledge/wall-aware**
(`core/enemies/walk.ts`): melee walkers `patrolDir` (chase within `AGGRO_RANGE`, else patrol — turn at
ledges/walls and keep going), ranged turtle/boss `advanceDir` (advance where there's floor, else hold and
fire across the gap). Levels are split per stage under `core/level/stages/` (types in
`types.ts`, shared helpers in `geometry.ts`, ordered campaign via `LEVELS`). **Random chest loot**: chests are
placed by position only and `rollReward(rng)` (weighted `REWARD_TABLE` in `core/level/chest.ts`) rolls each
chest's reward per run (engine seeds an `Rng` in `create()`). **Enemy drops**: slain foes may drop a pickup
(`createDrop`, collected like a chest; `rollReward(rng,false)` so drops never curse; bosses always drop).
The knight **starts owning only the dagger + torch** (active = dagger, +armor); **swap (X) cycles only owned
weapons** (`nextOwnedWeapon` over `MatchState.ownedWeapons`) and weapon chests/drops **add** new ones (axe;
the curse's lance) — so picking weapons up actually matters. Every throw also lands a **point-blank jab** (`resolveMelee`)
so arcing weapons hit adjacent foes. **Effects/VFX**: `engine/assets/effects.ts` plays
one-shot CraftPix art — an explosion on enemy/boss/player death, a `spark` on a non-fatal hit (enemy or
knight), and a magic-ring burst + the **reward icon** when a chest opens (`playEffect`/`rewardIcon`; art
under `public/assets/effects/` + `public/assets/icons/`). **Enemy projectiles** are real sprites, not
rectangles: each shot carries a presentation `sprite` tag in core (`spore`/`bullet`/`bolt`/`fire`) that
`engine/assets/sprites.ts` (`ENEMY_PROJECTILES`/`enemyProjectileVisual`) renders animated/tinted (rect
fallback). **Crouch has no sprite sheet** — the knight pack ships no Crouch art, so the renderer
(`engine/render/WorldRenderer`) squashes the idle pose vertically (foot-aligned) while the FSM is in
`crouch` (the state + shrunk hitbox are real).
**Procedural audio** (SFX + music, on/off toggle) and an **arcade high-score table** (3-letter initials) are in.
**Testing pyramid complete** (see `docs/TESTING-PLAN.md`): unit + headless `stepMatch` integration + Vue
component/store (Vitest) and **Playwright E2E + visual regression** (`e2e/`). 289 Vitest tests green.
Next: Phase 6 (code-split + deploy). Live detail in `memory/progress.md`.

## 9. Parallel agents

From Phase 4 onward (patterns established), parallelize: one agent per enemy/boss/level spec following
the §5 flow. In Phases 0-3 work serially (shared foundations).

## 10. Reference docs

- `docs/PLAN.md` — canonical project plan and roadmap.
- `docs/GDD.md` — full Game Design Document (levels, enemies, bosses, weapons, scoring).

## 11. CI/CD & branch protection

- **GitHub Actions** (`.github/workflows/ci.yml`) runs on every push to `main` and every PR, in two
  parallel jobs:
  - **`quality`** — `typecheck` → `lint` → `test:cov` → `build`.
  - **`e2e`** — installs Chromium and runs the **smoke** flows (`e2e/smoke.spec.ts`). Visual-regression
    snapshots are **not** in CI (baselines are macOS-only); run them locally with `pnpm test:e2e`.
- **`main` is branch-protected** — no direct pushes. Open a PR; both `quality` and `e2e` must be green
  and the branch up to date before merge (`enforce_admins` on, 0 required reviews — solo-dev friendly).
- **Deploy:** Vercel (`vercel.json`, Vite preset) deploys **production from `main`**. Since `main` only
  advances through a passing PR, a red CI gate keeps broken code out of production. Vercel still builds
  **preview** deploys for branches/PRs regardless of CI.
- **Workflow:** `git checkout -b <branch>` → commit → `git push -u origin <branch>` →
  `gh pr create --fill` → wait for green → `gh pr merge --squash`. (Repo is **public** → Actions is free.)
