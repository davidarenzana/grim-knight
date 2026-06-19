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

### Playtest fixes (after first manual test)

- One-way/semi-solid platforms (`Solid { oneWay }`) so ladders work through platforms and jumps land on top. ADR 0003.
- Jump impulse 400→560 (clears a ~90px platform). Ladder climbing fixed (up passes through one-way platform).
- Controls remapped: ←/→ move · ↑ jump (climb on ladder) · ↓ crouch (climb down) · Space throw.
- World boundary walls (left/right of screen) so knockback can't push the player off-screen into the void. (Until camera scroll exists.)
- Air control: steering input now works mid-air (change direction in the air); momentum preserved when no input. Lowered the tall wall to a jumpable crate.
- Projectiles now collide with solid walls (culled on hit); one-way platforms are ignored. `advanceProjectiles`/`stepWeapon` take an optional `solids`.
- Crouch is now visible and useful: the knight shrinks (feet planted) and its hitbox lowers, so it can duck under high shots.

- Plant enemy (ranged) + enemy projectiles: `core/enemies/plant.ts` (stationary, fires on `age` cadence),
  `stepEnemy` now returns `{ enemy, fired }`, `core/rules/combat.ts` gains `resolveEnemyProjectiles`,
  `weapon.ts` extracts `advanceProjectiles`. Wired into `GameScene` (plant in the wave, red enemy projectiles,
  damage = enemy contact OR enemy projectile). Spec `enemy-plant.md`. 110 tests green.

- First boss: `core/enemies/boss.ts` ("Cyclops Sentinel") — tough walker + 3-way spread volley (kind `boss`).
  HUD boss HP bar via `game:boss-hp`/`game:boss-cleared`; spawned at the end of the wave. Spec `boss-cyclops.md`.
- Stage timer: `core/level/timer.ts` countdown; HUD `TIME`; time-out costs a life (resets on respawn). Spec `stage-timer.md`.
- 120 tests green; typecheck/lint/build green.

- Camera scroll + level model: `core/level/level.ts` (`LevelDef` pure data + `LEVELS`), Phaser camera follows the
  player within `[0, worldWidth]` (levels wider than screen), world-boundary walls at level edges. Clearing a level
  advances to the next via `scene.restart({ levelIndex, session })` (lives/score carried); last level → `game:won`.
  HUD shows TIME; `game:level-changed` emitted. Specs `level-model.md`. 125 tests green.

### Phase 4 — Full structure rollout ✅ complete

- All 6 levels authored as `LevelDef` data (Graveyard, Haunted Forest, Swamp Caverns, Iron Fortress,
  Frozen Spires, Demon Keep), each ending in a boss. Validated by `level.test.ts` (6 unique names, bounds, boss).
- **Double loop**: clearing the last stage on loop 1 restarts at level 1 on loop 2 (harder: timer ×0.75,
  spawns compressed ×0.65); clearing loop 2 → `game:won` ("True Victory"). `loop` carried via `scene.restart`.
- HUD shows STAGE level-loop; win screen shows the true ending on loop 2.

### Phase 5 (in progress) — art & juice, and polish

- **Weapon variety** (core, TDD): `weapon.ts` now models **arc** (per-projectile gravity `ay` + upward
  `launchVy`) and **limited reach** (`maxRange` + per-projectile `traveled`, culled past range).
  New defs: `DAGGER` (fast, short reach), `TORCH` (arcs, gravity), `AXE` (arcs high). `WEAPONS` registry +
  `nextWeapon`/`weaponById` for swapping. `advanceProjectiles` applies gravity (semi-implicit Euler) and
  range-culls; straight weapons unchanged. `GameScene`: `activeWeapon` field, **Q** cycles weapons
  (edge-detected via `JustDown` in `update`), per-weapon greybox color, `game:weapon-changed` on swap.
  Spec `weapons.md` extended. 131 tests green; typecheck/lint/build green.
  Note: `exactOptionalPropertyTypes: true` — don't assign `undefined` to optional fields; spread them in
  conditionally (`...(x !== undefined ? { k: x } : {})`).

- **Chests & pickups** (core, TDD): `core/level/chest.ts` — a `Chest` is an AABB + `reward` + `opened`.
  `openChests(playerBox, chests)` opens (idempotently) every unopened chest the player overlaps and
  returns the new rewards. Reward kinds: `weapon` (by id), `armor`, `points`, `life`, `curse` (downgrade
  to lance). `session.gainLife` added (also reusable for score-threshold extra lives). `LevelDef.chests?`
  authored across all 6 levels (each has a weapon chest + extras; Iron Fortress has a risky curse chest).
  `GameScene` opens chests on contact, applies rewards (`applyChestReward`) and renders them (gold rects,
  hidden once opened). Specs `chests.md`. 138 tests green; typecheck/lint/build green.

- **Juice** (engine-only, no assets, smoke-tested): camera **screen shake** on player hit (`shake(150,0.01)`),
  on death (`shake(320,0.02)`) and a small kick per kill (`shake(90,0.006)`); **enemy hit-flash** (enemy rect
  flashes white for `HIT_FLASH`=0.1s the moment its HP drops, tracked by stable array index via an
  `enemyFlash` timer array); **i-frame blink** (knight alpha flickers while `armor.iFramesLeft > 0`). All in
  `GameScene` (no core change). 138 tests still green; typecheck/lint/build/dev(200) green.

- **Art pass — procedural textures** (engine, no external assets): `engine/assets/textures.ts` draws every
  sprite/tile with `scene.make.graphics` + `generateTexture` (keys in `TEX`). `GameScene` now renders the
  knight, all enemy kinds, chests via `this.add.image` (textured, `setDisplaySize` to body, `setFlipX` by
  facing, `setTintFill` hit-flash) and level geometry/ladders via `tileSprite`. Knight texture swaps
  armored↔bare; camera backdrop set. `ENEMY_COLOR` rect-coloring removed. Greybox rectangles gone except the
  tiny weapon/enemy projectiles. Verified: typecheck/lint/138 tests/build/dev(200) green. NOT visually
  confirmed in a browser (no headless browser installed) — run `pnpm dev` to eyeball, or swap real PNGs in
  later under the same `TEX.*` keys.

### Real sprite art pass (Phase 5) — CraftPix

- Swapped the procedural character textures for **CraftPix free pixel-art spritesheets** (animated):
  knight = Warrior_3 (spear+shield), zombie = Skeleton, plant = Plent, flyer = Fire_Spirit,
  ogre = Orc_Berserk, boss = Orc_Warrior. **Two knight skins driven by armor state**: `armored` =
  Warrior_2 (plate+shield), `underwear` = Warrior_3 (spear, no plate) — so an armor chest visibly re-armors
  the hero. Only the used PNGs were copied into
  `public/assets/sprites/<entity>/<State>.png` (+ `CRAFTPIX-LICENSE-*.txt`); the raw `test_art/` drop is
  gitignored and will be deleted. README has credits.
- Pipeline: `src/engine/assets/sprites.ts` (manifest + `preloadSprites`/`createAnims`/`hasAnim`). Sheets are
  square horizontal frames (knight/orc 96px, fantasy enemies 128px); each PNG → one texture `<entity>-<state>`
  → one animation. `GameScene.preload()` loads them; `create()` builds anims. Knight & enemies are now
  `Phaser.GameObjects.Sprite`s; `applySprite()` plays `<entity>-<state>`, scales (per-entity `scale`),
  foot-aligns (origin bottom + `foot` padding) or centers (flyer), flips by facing. `knightAnim()`/`enemyAnim()`
  map core FSM states → anim states. Lost-armor = red tint (no bare sheet); i-frame blink kept.
- Tiles/ladders/chests/projectiles stay procedural (`textures.ts`). The unused entity textures there are now
  dead (harmless) — trim later. Verified in headless Chrome: knight idle/run/attack/flip + hurt-tint,
  skeleton, fire-spirit all animate and align; no asset 404s. **Per-entity `scale`/`foot` are tunables**
  (plant/ogre/boss not yet eyeballed in-frame — adjust on feedback). 138 tests green; typecheck/lint/build green.

### Feedback/juice additions (Phase 5)

- **Stage-clear banner:** `onWin` now pops a centered "STAGE CLEAR!" (or "LOOP 1 CLEAR!" / "TRUE VICTORY!")
  banner and advances after `STAGE_CLEAR_MS` (1.7s) via `this.time.delayedCall` instead of restarting
  instantly — the player sees they finished the stage.
- **Chest pickup feedback:** opening a chest spawns a floating, fading label above the knight ("DAGGER!",
  "+500", "1UP!", "ARMOR!", "CURSED!") colored per reward (`applyChestReward` now returns `{label,color}`,
  `floatReward` tweens it). Verified in headless Chrome (the "DAGGER!" float + HUD `WEAPON dagger`).

### Playtest fixes (Phase 5)

- **Stage-clear freeze:** `scene.restart()` destroys all GameObjects but the render-pool arrays
  (`projRects`/`enemyProjRects`/`enemySprites`/`chestSprites`) were scene fields holding dead refs → the next
  frame threw every frame and the game froze after beating a boss + clearing enemies. Fixed by resetting all
  pools to `[]` in `create()`. (Gotcha logged in `conventions.md`.)
- **Top HUD overlap:** the in-canvas Phaser help text overlapped the Vue HUD; moved it to the bottom
  (`setOrigin(0,1)`, `y=height-8`, dim bg).

## In progress 🔧

- Phase 5: weapon variety + chests/pickups + juice + procedural-art pass done (+ playtest fixes). Next: audio, then optionally
  real CC0 sprite/tilemap art (drop PNGs, preload under `TEX.*` keys), more juice (kill particles, fades).

## Next ⏭️ (Phase 5 — art & juice, and polish)

- Audio (SFX/music) via Phaser (procedural synth or CC0 files).
- Optional: replace procedural textures with CC0/own PNG sprites + tilemaps (same `TEX.*` keys, no render change).
- More juice if wanted: particles on kill, transition fades.
- Polish: extra lives at score thresholds (reuse `gainLife`), high-score table, torch ground-fire hazard.
- Polish: extra lives at score thresholds (reuse `gainLife`), high-score table, torch ground-fire hazard.
- Phase 6: production build optimization (code-split Phaser chunk) + static deploy.

## Recent decisions

- core/engine/ui split → ADR 0001.
- Fixed-timestep simulation + interpolation → ADR 0002.
