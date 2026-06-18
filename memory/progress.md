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

### Phase 3 — Enemies, combat, full game loop ✅ core complete

- `core/enemies/zombie.ts`: rising walker (rising→walking→dead), walks toward player, HP, `hitEnemy`. Spec `enemy-zombie.md`.
- `core/rules/combat.ts`: `resolveCombat(playerBox, projectiles, enemies)` → consumed projectiles, damaged enemies, `playerHit`, `kills`. Spec `combat.md`.
- `core/rules/session.ts`: lives/score/game-over/won transitions (`createSession`/`addScore`/`loseLife`/`win`). Spec `scoring-lives.md`.
- `engine/scenes/GameScene.ts`: spawns 3 zombies, chases player, resolves combat, applies player damage,
  handles death→respawn→lives→game-over, win when all enemies dead, emits all `game:*` events to the HUD.
  Pause/resume wired via bus with shutdown cleanup. Enemy/projectile render pools.
- `src/ui/stores/game.test.ts`: smoke tests for the bus↔store bridge (Pinia, headless).
- 84 Vitest tests green; typecheck/lint/build green; dev server boots (HTTP 200). **Playable greybox loop end-to-end.**

### Phase 4 (in progress) — Full structure rollout

- Generalized enemy model: `core/enemies/enemy.ts` (shared `Enemy`, `EnemyKind`, `EnemyTarget`, `hitEnemy`).
  Per-kind step routed by `stepEnemy` in `core/enemies/index.ts`. `stepX(e, target{x,y}, solids, dt)` signature.
- New enemies: `flyer.ts` (flying chaser, no gravity, sine bob), `ogre.ts` (heavy walker, 3 HP). Specs + tests.
- `core/level/spawner.ts`: timed `SpawnEvent` scheduler (`createSpawner`/`stepSpawner`/`isFinished`). Spec `spawner.md`.
- `GameScene`: spawner-driven finite wave (zombie/flyer/ogre), per-kind colors, win when spawner finished + all dead.
- `combat.ts` now imports the shared `Enemy`; works across all kinds. 99 tests green; typecheck/lint/build green.

## In progress 🔧

- Phase 4 continues: first boss + level model (scroll/timer) + ranged enemy (plant) needing enemy projectiles.

## Next ⏭️

- Plant enemy (ranged) → extend combat with enemy projectiles damaging the player.
- First boss (`core/enemies/boss-*.ts` or `core/bosses/`) with an attack pattern + HP bar.
- Level model (`core/level/`): scroll, per-stage timer (emit `game:time-changed`), stage transitions.
- Then 6-level rollout + double loop + audio. (Good point to parallelize: one agent per enemy/boss/level spec.)

## Recent decisions

- core/engine/ui split → ADR 0001.
- Fixed-timestep simulation + interpolation → ADR 0002.
