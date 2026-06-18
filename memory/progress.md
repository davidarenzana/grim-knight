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

### Phase 2 — Player vertical slice (greybox) ✅ complete

- `core/rules/armor.ts`: 2-hit armor FSM (`armored`→`underwear`→`dead`) + pickup + i-frames + `tick`. Spec `specs/armor-damage.md` (implemented).
  `ArmorState` now lives here as the single source of truth; `shared/events.ts` re-exports it.
- `core/fsm/player.ts`: full player FSM (idle/run/jump/crouch/climb/throw/hurt/die) over `Body`, with embedded `Armor`.
  Ground-only control, no double-jump, ladder climbing (gravity off), knockback+i-frames on hit, fatal hit → die.
  New signature: `stepPlayer(player, input, world, dt)` where `world = { solids, ladders?, damaged? }`.
  Specs: `player-movement.md`, `player-climb.md`, `player-damage.md` (all implemented).
  Tunables: GRAVITY=1500, WALK=120, JUMP=400, CLIMB=90, HURT=0.4s, THROW=0.25s, KNOCKBACK (140,-180).
- `core/weapons/weapon.ts`: projectile model (`fire`/`stepWeapon`) with cooldown, on-screen cap, out-of-bounds cull;
  `LANCE` def. Spec `specs/weapons.md` (implemented). Wired into `GameScene` (X to throw, projectile rects rendered).
- `engine/scenes/GameScene.ts`: renders the real simulation (stepper + `stepPlayer` + `stepWeapon` + keyboard + interpolation),
  replacing the demo back-and-forth. Greybox level = ground + platform + wall.
- 52 Vitest tests green; coverage 100% lines / ~91% branches on core. typecheck/lint/build green.

- `engine/scenes/GameScene.ts`: greybox level now has a ladder; keys split (W/Up climb vs Space jump); world passed each step.
- 61 Vitest tests green; coverage 100% lines on core. typecheck/lint/build green. Vitest 3 `environmentMatchGlobs` removed (use `// @vitest-environment jsdom` docblock).

## In progress 🔧

- Phase 3: first enemy + combat resolution + wiring damage/lives/game-over to the HUD.

## Next ⏭️ (Phase 3)

- `core/enemies/zombie.ts`: rising walker with HP, walks toward the player (TDD).
- `core/rules/combat.ts`: resolve projectile↔enemy and enemy↔player collisions (who takes damage).
- `core/rules/session.ts` (or similar): lives, score, game-over from the play loop.
- Wire into `GameScene`: spawn enemies, step them, resolve combat, emit `game:armor-changed/lives-changed/over` to the HUD.

## Recent decisions

- core/engine/ui split → ADR 0001.
- Fixed-timestep simulation + interpolation → ADR 0002.
