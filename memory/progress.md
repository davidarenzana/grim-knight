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

### Scenery art pass (Phase 5) — CraftPix tileset

- New scenery from CraftPix **"Cartoon Medieval Ruins"** level set (`public/assets/tiles/`, loaded by
  `engine/assets/tiles.ts` → `preloadTiles`/`TILE`/`backgroundFor`): static dusk **background** per level
  (graveyard vs cave), grassy **ground** (`tileSprite`), wooden **crate** (small solids), real **chest**
  sprite, **ladder** image. `GameScene` geometry loop routes solids: small solid→crate image; everything
  else (ground + one-way ledges)→ground tile. Ladder stretched a bit wider than the 16px hitbox; chest
  drawn bottom-aligned a bit larger than its box.
  - **Aerial platforms**: one-way ledges reuse the ground tile. (First tried the `Bridge` tile, but it's a
    rounded/transparent ledge that vanished when cropped to 20px → platforms were invisible and ladders ran
    into the void. `platform.png` removed.)
  - **Procedural `textures.ts` deleted** (fully replaced by sprites + tiles); only projectiles stay
    rectangles. Cartoon tiles + pixel characters read fine (shared dark palette/outlines). Verified in
    headless Chrome. typecheck/lint/build/138 tests green.

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
- **Proximity spawns + longer stages:** spawner rewritten from timed to position-triggered. A `SpawnEvent`
  is now `{ kind, x, y, triggerX? }` (no `at`); `stepSpawner(s, playerX)` wakes events whose `triggerX ?? x`
  is within `ACTIVATION_RANGE` (480px ≈ one screen) of the player. Fixes the report that the boss advanced
  on the player from across the world when standing still at the start — enemies don't exist (so can't move)
  until you approach their zone. All 6 stages widened (~2800–3400px, was 1600–2200) with more
  platforms/ladders/enemies/chests spread out, each boss moved to the far right, timers bumped to 140–150s.
  `GameScene` drives the spawner with the player x instead of `dt`; dropped the loop-2 `spawnScale` (loop 2
  stays harder via the time scale). Spec `spawner.md` + `spawner.test.ts` updated. 139 tests green.

### Art + levels overhaul (Phase 5) — themes, new creatures, GnG-style stages

Plan: `docs/ART-LEVELS-PLAN.md`. Done in four committed phases:

- **A — per-level themes:** `LevelTheme` (ruins/forest/cave/castle/ice/hell) on each `LevelDef`;
  `tiles.ts` maps it to a ground tile + backdrop, loaded per theme from `public/assets/tiles/<theme>/`.
  Theme art prepared with PIL from the CraftPix swap/dungeons/medieval packs (ice/hell tinted; castle/ice
  backdrops are built gradients). Every stage now looks distinct. ADR [[0004-level-themes]].
- **B — three new enemies** (pure-core TDD): `centipede` (fast fragile crawler), `turtle` (slow armored
  walker + straight bullet), `bloated` (stationary arcing-bolt caster). 72px sheets in
  `public/assets/sprites/<kind>/`, registered in `SPRITES`, routed in `stepEnemy`, woven into all stages.
- **C — GnG-style geometry:** `floor(width, pits)` carves jumpable gaps (≤~85px); `hasFallenOut`
  (`core/rules/fall.ts`) = fall-out death for the player and enemy culling; `touchesHazard`
  (`core/rules/hazard.ts`) + `LevelDef.hazards` for spike/lava contact damage (folded into the armor
  damage path). Invariant tests guard passability. Specs `fall-out.md`, `hazards.md`. ADR [[0005-hazards-and-pits]].
  Confirmed working in-game by the user (pits + spikes).
- **D — three boss variants:** `BOSS_VARIANTS` (1–3, one skin per pair of stages), escalating HP + a
  wider/faster volley (3-way→5-way). `Enemy.variant` selects stats + the `boss<variant>` skin; HUD bar
  uses the variant max HP. Old single-boss art removed.

170 tests green; typecheck/lint/build clean throughout. Sprite/tile scales tuned via PIL mocks (no headless
browser in the dev env); the user play-tested in the real game.

### Post-overhaul tweaks + level refactor

- **Ledge-aware enemies:** walkers (zombie/ogre/centipede/turtle/boss) no longer stroll off ledges into
  pits — `core/enemies/walk.ts` (`chooseDir`/`groundAhead`) turns them around at an edge; ranged
  turtle/boss still aim/fire across the gap. User-reported: enemies were falling into pits.
- **Spikes narrowed** to 40px wide (the jump over them was too tight); pits untouched so the jumpable
  invariant still holds.
- **Level split refactor:** `core/level/level.ts` (one big file) split into `types.ts`, `geometry.ts`
  (shared `floor`/`oneWay`/`spikes`/`lava` + ground constants) and one module per stage under
  `core/level/stages/` (+ `STAGES` order in `index.ts`); `level.ts` re-exports the types and `LEVELS`.
  Pure refactor; new `stages.test.ts` locks each stage's identity + order. 178 tests green.

### Effects VFX + random chest loot + reward icons (Phase 5)

- **Random chest loot** (core, TDD): `core/level/chest.ts` gains `rollReward(rng)` over a weighted
  `REWARD_TABLE` (weapon/points common, armor uncommon, curse occasional, 1UP rare) with `CHEST_WEAPONS`
  /`CHEST_POINTS` pools. `Chest` gains `random`; `createChest(x, y)` (reward omitted) marks it random,
  `createChest(x, y, reward)` stays fixed. All 6 stages now place chests by **position only** → loot is
  rolled per run. The engine seeds an `Rng` off the wall clock (mixed with level/loop) in
  `create()` and rolls each random chest's reward (`this.chests = … rollReward(lootRng)`). 6 new chest
  tests (determinism, valid kinds, pools, every entry reachable, random/fixed flag). Spec `chests.md` updated.
- **Effects pipeline** (engine): `engine/assets/effects.ts` — `EFFECTS` registry with two shapes:
  `frames` (per-frame PNGs `assets/effects/<name>/1..N.png`, stitched via an anim with mixed texture
  keys — used for the 256px CraftPix `explosion`) and `sheet` (one horizontal spritesheet — the 72px
  `magic_ring`). `preloadEffects`/`createEffectAnims`/`playEffect(scene,name,x,y,scale)` (one-shot sprite
  that self-destroys on `ANIMATION_COMPLETE`, no pool). Reward **icons** (CraftPix dungeon items, 32px:
  heart/coin/crystal/star) via `preloadIcons`/`ICON`/`rewardIcon(reward)` (weapon → its projectile art
  frame 0; life→heart, points→coin, armor→gem, curse→purple-tinted star).
- **GameScene wiring:** preloads/creates the effects+icons; **enemy/boss death** pops `explosion` at the
  body center (0.32, boss 0.7) once via an `enemyExploded[]` flag + a small camera shake; **chest open**
  plays `magic_ring` at the chest and `floatRewardIcon` pops the item icon out (bounce-up-fade) alongside
  the existing label, positioned from the newly-opened chest (diffed `prevChests`).
- Assets copied to `public/assets/effects/{explosion/*,magic_ring.png}` + `public/assets/icons/*` (+ CraftPix
  licenses). 184 tests green; typecheck/lint/build/dev(200) green. Not eyeballed in a real browser this
  session — `pnpm dev` to confirm the VFX/icons visually.

### Hit sparks + sprite-based enemy projectiles (Phase 5)

- **Enemy projectile art** (core tag + engine render): `Projectile` gains a presentation-only `sprite?:
string` (pure data). Each ranged enemy tags its shots — plant→`spore`, turtle→`bullet`,
  bloated→`bolt`, boss→`fire` — asserted in each enemy's fire test. Engine pipeline in
  `engine/assets/sprites.ts`: `ENEMY_PROJECTILES` registry (`frames` = animated fireball from
  `assets/sprites/enemy/fire/1..6.png`; `image` = static `bolt`/`bullet`, `spore` reuses bolt art),
  `preloadEnemyProjectiles`/`createEnemyProjectileAnims`/`enemyProjectileVisual(id)`.
  `GameScene.renderEnemyProjectiles` now keeps **two pools** (sprite + the old rect) and per index shows
  one: a known tag → animated/`setTintFill`-colored sprite (fireball orange, bullet natural, spore green,
  bolt purple), flipped by `vel.x`; unknown/none → red rectangle fallback. Enemy shots no longer look
  procedural.
- **Hit effects** (engine): new one-shot `spark` effect (golden `Circle_explosion`, 10 frames, fast) in
  `effects.ts`. Played at an enemy on a **surviving** HP drop (a kill keeps the bigger death explosion);
  at the knight on a **fresh non-fatal hit** (detected via `iFramesLeft` 0→>0 around `stepPlayer`); and a
  death `explosion` at the knight in `onPlayerDead`.
- Assets: `public/assets/effects/spark/*`, `public/assets/sprites/enemy/{fire/*,bolt.png,bullet.png}` (+
  CraftPix license). 184 tests green (4 new enemy assertions); typecheck/lint/build/dev(200) green.
- **Follow-up tweaks** (after first eyeball): static orb projectiles were too big → display scale
  `p.w*2`→`p.w*1.3`. **Wall-impact spark**: `advanceProjectilesDetailed` (pure) returns `{ alive, culled }`
  with a `CullReason` (`wall`/`bounds`/`range`); `advanceProjectiles` is now a thin wrapper over it.
  `GameScene` uses the detailed form for both player and enemy projectiles and pops a small `spark` at each
  `wall` cull (`sparkWallHits`); off-bounds/range culls don't spark. `stepWeapon` no longer used by the
  scene (inlined cooldown decay + advance). 185 tests green.

### Walker AI: patrol + proximity chase (no ledge jitter) (Phase 5)

- **Fix:** walkers jittered/froze at a ledge — `chooseDir` turned them _away_ from the player at an edge,
  then re-targeted the player next tick, oscillating in place. Reported in-game ("se quedan enganchados").
- `core/enemies/walk.ts` rewritten. New helpers: `wallAhead` (turn at walls too, not just ledges),
  `canStep` (= `groundAhead && !wallAhead`), and two movement modes:
  - **`patrolDir(body, facing, targetX, solids, aggro=AGGRO_RANGE)`** (melee: zombie/ogre/centipede) —
    chase the player only within `AGGRO_RANGE` (200px) **and** when reachable; otherwise **patrol**:
    keep the current `facing`, flip at a ledge/wall and carry on. Returns 0 only when boxed in both sides.
    So enemies no longer beeline the moment they wake (spawner range ~480px), and they turn at edges and
    keep walking instead of sticking.
  - **`advanceDir(body, targetX, solids)`** (ranged: turtle/boss) — advance toward the player where
    there's floor, else **hold** position and keep firing across the gap (aim `facing` still tracks the
    player). No pit dives, no jitter.
- `chooseDir` removed; `walk.test.ts` rewritten (patrol turn-and-continue, out-of-range patrol, wall probe,
  ranged hold-at-ledge). Zombie tests updated for proximity chase + a patrol-when-far case. 191 tests green;
  typecheck/lint/build green. Tune `AGGRO_RANGE` on feedback.

### Soft-lock safety net: enemies under the floor (Phase 5)

- **Report:** an enemy "under the floor" couldn't be killed → stage never cleared (win needs every enemy
  dead). Tried hard to reproduce a physics sink: a faithful headless engine loop (player walks/jumps each
  level, world boundary walls included) — **no enemy ever sinks** in pure core (vertical resolution always
  lands a falling body _on top_ of a solid; walkers have no upward velocity to be pushed under). So the
  cause isn't core physics.
- **Fix (safety net):** `core/rules/fall.ts` adds `hasSunkUnderFloor(body, groundY)` (`pos.y > groundY`).
  `GameScene` culls (marks dead) any living **non-flyer** enemy whose top edge is below the ground line
  (`GROUND_Y`) — no legit ground enemy rests that low (they stand on top; flyers hover low legitimately and
  are exempt). Guarantees a wedged enemy can never block stage-clear, whatever the trigger. 6 fall tests
  (incl. 3 new sunk cases). 194 tests green; typecheck/lint/build green.
- **Likely real cause to watch:** the reported enemy looked like a short/low green one (centipede/bloated).
  Arcing weapons (axe/torch) fly _over_ a point-blank low enemy, so with random loot the player can be
  holding an axe that can't hit it — **swap to the lance with X** (straight, always hits). If this recurs,
  consider giving arc weapons a flatter point-blank hit or a small melee hitbox.

### Point-blank jab + dagger start + enemy drops (Phase 5)

- **Arc weapons hit point-blank** (the soft-lock cause): `core/rules/combat.ts` adds `resolveMelee(box,
enemies)` (every living enemy overlapping the box takes a hit). On a throw that actually fires, `GameScene`
  builds a small jab box (`MELEE_REACH=26`px, full body height) in front of the knight and applies it after
  the projectile pass — so axe/torch (which fly over an adjacent foe) still connect. Applies to all weapons
  (a consistent jab); merged into the tick's kill count/scoring. 3 melee tests.
- **Starting loadout:** the knight now starts with the **dagger** (+armor), not the lance. `activeWeapon`
  default + `create()` set to `DAGGER`. The lance remains the curse-downgrade weapon and `CHEST_WEAPONS`
  is unchanged (dagger/torch/axe).
- **Enemy item drops:** `core/level/chest.ts` adds `createDrop(x,y,reward)` (a `Chest` flagged `drop`,
  collected on touch via `openChests`). `rollReward(rng, includeCurse=true)` refactored (split
  `POSITIVE_TABLE` + `CURSE_ENTRY`); enemy drops pass `false` (a slain foe never hands you a curse).
  `GameScene.maybeDropItem` on a kill: bosses always drop, regular enemies at `DROP_CHANCE=0.18`, rolled
  with the per-run `lootRng` (now a field). Drops live in `this.drops`, render as the reward's bobbing icon
  (`renderDrops`), and are collected with the same magic-ring + icon + label feedback as chests
  (`collectReward` helper, shared by chests and drops). 4 new chest/drop tests.
- 200 tests green; typecheck/lint/build green. Not eyeballed in a browser this session.

### Bugfix: enemy spawned inside a crate (stage-clear soft-lock) (Phase 5)

- **Root cause found** (user pinpointed it): two stages spawned a walker at the **same x as a crate**:
  Haunted Forest `zombie@2100` + crate@2100, Iron Fortress `turtle@1150` + crate@1150. The enemy lands on
  top of the crate where ground throws hit the crate instead → unkillable → stage never clears.
- **Fix (data):** moved the crates clear — Haunted Forest crate 2100→1980, Iron Fortress crate 1150→1090.
- **Guard (test):** new `stages.test.ts` invariant — no ground-enemy spawn box may overlap a non-one-way
  solid (crate/pillar), across all six stages. Catches this class of bug for good. 201 tests green;
  typecheck/lint/build green.

### Front-end menus, vertical tower & control polish (Phase 5)

- **Title + stage-select menus** (Vue, `src/ui/views/`): `MainMenu.vue` (title screen — START / SELECT
  STAGE over a stage backdrop with boss art) and `LevelSelect.vue` (pick any stage) front the game. The
  store (`src/ui/stores/game.ts`) gained a `Screen` union (`menu | levels | playing | paused | gameover |
won`) plus `startGame()` / `openLevels()` / `selectLevel(index)` / a `startLevel` ref consumed by the
  engine (`consumeStartLevel`) so the scene boots at the chosen stage. Menu buttons share `.btn-pixel`
  (`style.css`); the title's two buttons are **stacked and shrunk** via scoped overrides in `MainMenu.vue`
  (left other views' buttons untouched).
- **Vertical tower stage:** Iron Fortress is now a vertical climb — a tall `worldHeight` (≫ screen) with the
  camera scrolling vertically as the knight ascends ladders. Plus a **ladder-dismount fix**.
- **Lava recessed + jumpable:** `lava(x, w)` (`core/level/geometry.ts`) now sits INTO the ground band (top
  2px above the surface) so it reads as a recessed pool, not a floating bar, and pools were narrowed to stay
  jumpable. New guardrail `core/level/jumpable.test.ts` asserts every authored hazard width ≤ `SAFE_HAZARD_W`
  (< `MAX_JUMP_GAP`) so a too-wide spike/lava strip can never soft-lock a stage.
- **NES-style controls:** remapped from `Space` throw + `Q` swap to **`Z` (or `Space`) throw** and **`X`
  swap** (`GameScene` key bindings) — move with the right hand on arrows, act with the left on Z/X. Arrows
  and WASD both still move.
- **Crouch squash:** the CraftPix knight pack has no Crouch sheet, so ducking froze on the idle pose.
  `GameScene` now squashes the sprite vertically (×0.62 Y, slight ×1.08 widen, foot-aligned origin) while
  `player.state === 'crouch'`, so the duck reads. The FSM `crouch` state + shrunk hitbox were already real.
- 211 tests green; typecheck/lint/build green.

### Hexagonal architecture review + testable application layer (Phase 5)

Pairs with `docs/TESTING-PLAN.md` (the gap: engine/integration/visual untested because orchestration
lived inside the Phaser adapter). Incremental, behavior-preserving:

- **H1 — airtight core purity** (`eslint.config.js`): the core-purity rule now also blocks `mitt`,
  `@shared`/`@shared/*` and DOM globals (`window`/`document`/`localStorage`/`navigator`) from `src/core`.
  Effects must cross the boundary as data, not direct calls.
- **H2 — `core/app` application layer** (`src/core/app/types.ts`): pure port/state contracts —
  `MatchState`, `MatchConfig`, `PlayerInput` (input port), `Effect` (`shake`/`vfx`/`float`/`notify`, the
  output port as DATA), `GameNotification`, `MatchPhase` (`playing`/`gameover`/`cleared`), `StepMatch`.
- **H3 — `stepMatch` extracted** (`src/core/app/match.ts`): the application use case — a pure, faithful
  re-implementation of `GameScene.tick()` that orchestrates the domain and **returns effects as data**
  instead of calling Phaser/the bus. Plus `createMatch(level, opts)` (the pure half of `create()`:
  geometry, spawner, rolled loot, timer). Scene-flow stays in the adapter: terminal `phase`s hand back
  control (gameover screen / campaign advance), and purely-visual flourishes the adapter can derive from
  state (enemy death burst, hit-flash) stay in render. **14 headless integration tests** (`match.test.ts`)
  cover the bug classes unit tests miss: soft-lock cull, win condition, time-out/pit death + respawn,
  spawn-on-approach, combat→score, chest pickup, determinism, and `createMatch`. 225 tests green;
  typecheck/lint/coverage green.
- **H4 — `GameScene` is now a thin adapter**: `create()` calls `createMatch`; `update()` reads input →
  `stepMatch` (inside the fixed-step `stepper`) → `runEffects` interprets the `Effect[]` (shake→
  `cameras.shake`, vfx→`playEffect`, float→reward tweens, notify→`bus.emit`); the `cleared` phase triggers
  `onWin` (campaign transition). All sim fields collapsed to `this.config`/`this.state`; the ~170-line
  `tick()` and the moved helpers (`onPlayerDead`/`applyChestReward`/`maybeDropItem`/`emitBossHp`/
  `spawnEnemy`/`bossVariant`/`sparkWallHits`) are gone. Render-only flourishes stay in the adapter: the
  enemy death-burst (in `renderEnemies`) and the white hit-flash (now derived by an HP diff per frame).
  `GameScene` shrank 1048→727 lines; no game logic remains in it. 225 tests green; typecheck/lint/build
  green. Also fixed the stale in-canvas help text (now ←→ / Z / X) and added an initial
  `game:time-changed` emit so the HUD clock shows immediately. **User play-tested H4 in the real game — it
  works** (combat, pickups, death/respawn, stage clear).
- **H5 — boundary cleanup + close-out**: replaced the `engine/session-start.ts` module-global (a
  service-locator smell) with the Phaser game **registry** (`START_LEVEL_KEY`, set in `createGame`, read in
  `GameScene.init`); deleted that file. Documented the whole decision in ADR
  [[0006-hexagonal-application-layer]]. The hexagonal review is complete: domain (`core/`) + application
  (`core/app/`) pure and airtight; `engine/` (driven) and `ui/` (driving) are adapters; the `mitt` bus is the
  engine↔ui bridge port. 225 tests / typecheck / lint / build green.

### Testing layers — Phase C: Vue component + store tests (Phase 5)

Per `docs/TESTING-PLAN.md` (Layer 3). The store's 3 smoke tests grew to 9 that assert the **correct**
mirrored HUD values (score/lives/armor/weapon/time/level/loop), the boss-bar flow, the terminal-screen
switches, and every `ui:*` command + payload — with `bus.all.clear()` between tests to isolate the shared
mitt singleton. Added component tests (`@vue/test-utils` + jsdom) for `MainMenu` (START → playing/level 0,
SELECT STAGE → levels) and `LevelSelect` (one button per stage, click → startAtLevel, BACK → menu). 237
tests green; typecheck/lint green.

### Testing layers — Phase D: Playwright E2E + visual regression (Phase 5)

Per `docs/TESTING-PLAN.md` (Layer 4) — the only layer that runs the real build in a browser. Added
`@playwright/test` + `playwright.config.ts` (webServer = `pnpm build && pnpm preview` on :4173, chromium).
`e2e/smoke.spec.ts`: title→START→canvas boots, SELECT STAGE→pick→canvas boots, and keyboard (←/Z/X)
drives the running game without a pageerror — which **also confirms the H4 adapter refactor works
end-to-end in a browser**. `e2e/visual.spec.ts`: committed screenshot baselines of the title and
stage-select screens (stable DOM/CSS; the live animated/RNG canvas is intentionally not snapshotted).
Scripts: `pnpm test:e2e` / `pnpm test:e2e:update`. Baselines are platform-specific (`*-darwin.png`) — CI on
another OS must regenerate. 5 E2E pass; 237 unit pass; typecheck/lint green.

**All four testing layers (A–D) and the hexagonal review (H1–H5) are now complete.**

### Playtest fixes: boss arena, tower spikes, starting weapons (Phase 5)

- **Demon Keep (stage 6) boss reachable:** removed the pit at `x:2700` that sat right before the boss
  arena — the boss (ranged `advanceDir`, slow 36px/s) held at the pit edge raining its 5-way volley while
  the player died trying to jump across. The final boss now has a flat approach/arena. (The boss was never
  code-stuck — confirmed headlessly it advances on flat ground; the pit was the death trap.)
- **Iron Fortress (stage 4) spikes:** narrowed the tower-shelf spikes 56→40px so they're comfortably
  jumpable on the cramped one-way shelves.
- **Starting weapons:** previously swap (X) cycled the whole 4-weapon registry, so you effectively had every
  weapon from the start and chests were pointless. Added `MatchState.ownedWeapons` (starts `[dagger, torch]`);
  swap uses `nextOwnedWeapon` (cycles only owned), and weapon chests/drops/curse `equip()` → add to owned +
  set active (invariant: active ∈ owned). New tests: `nextOwnedWeapon`, `createMatch` owned set, chest adds
  to owned. 239 tests green; typecheck/lint green.

### Playtest fix: no killing off-screen enemies (Phase 5)

You could throw and kill enemies you couldn't see (proximity spawns wake ~480px away, just off the ~400px
half-screen; a fast projectile reached them off-camera). Now the player's combat is **gated to the visible
region**: `resolveCombat`/`resolveMelee` take an optional `view: AABB` and only damage enemies overlapping
it (projectiles pass through off-screen foes and keep flying). The adapter (`GameScene.step`) passes
`cameras.main.worldView` into `stepMatch` each tick (and `stepMatch`/`StepMatch` forward it). Omitting
`view` disables the gate, so all existing tests/usages are unaffected. Spec `combat.md` + 3 tests. 242 green.

### Audio (procedural SFX + music) + on/off toggle (Phase 5)

Audio is an **output adapter**, so it rides the same effects pipeline. `stepMatch` now emits
`{type:'sound', name}` effects (`SoundName`: throw/jump/hit/kill/hurt/die/pickup/stage-clear) at the right
moments; `GameScene.runEffects` plays them. `src/engine/audio.ts` is a tiny **Web Audio synth** (no audio
files shipped — fits "original IP, no external assets"): lazy `AudioContext` (created on the first
gesture/START), a master `GainNode` for mute, oscillator/noise SFX, and a subtle low arpeggio
`startMusic`/`stopMusic` (started in `create()`, stopped on scene SHUTDOWN; idempotent). **On/off toggle**:
store `audioOn` (persisted to `localStorage`, guarded for the node test env) + `toggleAudio()` emit
`ui:audio {on}`; the audio adapter subscribes and ramps the master gain. `bind()` emits the persisted pref
at boot. UI: `AudioToggle.vue` (🔊/🔇) pinned top-right in `App.vue`, on every screen. 245 unit + 5 E2E
green. (The corner button's pixel diff is under the 2% visual-snapshot threshold, so menu baselines were
unchanged.)

## In progress 🔧

- Phase 5 art/levels overhaul is **done** (themes, 3 new enemies, pits + hazards, 3 boss variants, level
  refactor, **death/hit VFX + chest VFX/icons + random loot + sprite enemy projectiles**). Remaining
  Phase 5 work: audio, then optional juice (more particles, transition fades).

## Next ⏭️ (remaining Phase 5 polish, then Phase 6)

- More juice if wanted: particles on kill, transition fades.
- Polish: time/no-damage score bonuses, extra lives at score thresholds (reuse `gainLife`), high-score
  table, torch ground-fire hazard.
- Richer boss/hazard designs from the GDD (unique boss patterns; water/crushers/wind/collapsing floors).
- **Phase 6 — build optimization + deploy** (deferred together, per the user):
  - **Code-split the Phaser chunk.** Build is one ~1.6 MB (384 kB gzip) JS bundle, ~90% Phaser.
    1. **Lazy-load Phaser**: dynamic-`import()` `GameCanvas`/`@engine/game` (e.g. `defineAsyncComponent`) so
       the Vue menu boots without Phaser; the engine chunk loads on START (biggest perceived-load win — the
       player sits on the title screen first). Mask the first-START delay with a "Loading…"/background prefetch.
    2. Optional `manualChunks` vendor split (Phaser → own chunk) for cross-deploy caching + to silence the
       > 500 kB warning (secondary; doesn't defer the download).
  - **Static deploy** (GitHub Pages); `vite.config.ts` `base` is already `./`. See `docs/PLAN.md` Phase 6.

## Recent decisions

- core/engine/ui split → ADR 0001.
- Fixed-timestep simulation + interpolation → ADR 0002.
- One-way (semi-solid) platforms → ADR 0003.
- Per-level visual themes → ADR 0004.
- Pits (fall-out) + contact hazards → ADR 0005.
