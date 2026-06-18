# Progress

> Source of truth for the project status. Update when closing each task.

## Done ✅

### Phase 0 — Scaffolding + process

- Git repo, structure `src/{core,engine,ui,shared}`, `docs/`, `specs/`, `memory/`.
- Stack: Vue 3 + Phaser 3 + TS strict + Pinia + mitt + Vitest + ESLint/Prettier + Husky + Vite (pnpm).
- Configs: `tsconfig`, `vite.config`, `vitest.config` (core in node, ui in jsdom, coverage over core),
  `eslint.config` (incl. `core/` purity rule), `.prettierrc`.
- Process/context: `AGENTS.md`, `memory/*` (this system), `docs/PLAN.md`, `docs/GDD.md`,
  `specs/_TEMPLATE.md` + 2 specs. Project language standardized to English.
- Hello-world: Vue menu → Phaser canvas (greybox GameScene with placeholder knight) → HUD/pause/gameover.
- UI↔game bridge via `mitt` bus (`src/shared/events.ts`) + Pinia store (`src/ui/stores/game.ts`).

### Phase 1 — Engine core (TDD, pure)

- `core/math`: `vector.ts` (Vec2 + pure ops), `aabb.ts` (collision/penetration), `rng.ts` (deterministic mulberry32).
- `core/sim/loop.ts`: fixed-timestep stepper (accumulator + interpolation alpha + spiral-of-death clamp). Spec: `specs/sim-loop.md`.
- `core/physics/body.ts`: dynamic body, gravity integration, per-axis AABB collision resolution (grounded flag).
- 31 Vitest tests green; 100% lines on core, branches ≥90% global. `pnpm typecheck`, `pnpm lint`, `pnpm build` all green.

## In progress 🔧

- (nothing active)

## Next ⏭️

- Wire `GameScene` render to a real simulation tick (use `createStepper` + a `Body`), replacing the demo back-and-forth.
- Phase 2: player FSM (idle/run/jump/crouch/climb/throw/hurt/die) + 2-hit armor (`core/rules/armor.ts`, spec exists) + lance weapon.
  Specs already drafted: `specs/player-movement.md`, `specs/armor-damage.md`.

## Recent decisions

- core/engine/ui split → ADR 0001.
- Fixed-timestep simulation + interpolation → ADR 0002.
