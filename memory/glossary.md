# Domain glossary

> Project-original names (original IP). Do not use Capcom names.

- **Knight**: the playable character. Original equivalent of the genre's protagonist.
- **Armor (2 hits)**: the knight withstands one hit by losing the armor (`armored` → `underwear`); the
  second hit kills him (`dead`). States in `shared/events.ts:ArmorState`.
- **Underwear (`underwear`)**: vulnerable state after losing the armor.
- **Weapon**: equippable projectile/tool (lance, dagger, torch, axe, shield...). Only one active at a time.
- **Chest / loot**: container that drops a weapon or power-up; some may be a trap.
- **Double loop**: after finishing the levels, the game repeats (harder) and only then is it considered
  completed. Classic genre mechanic.
- **Level / stage**: a playable scrolling segment with enemies, a boss and a timer.
- **Boss**: end-of-stage enemy with its own pattern.
- **Spawn / spawner**: enemy spawn rule. `core/level/spawner.ts` is **position-triggered**: an enemy wakes once the player walks within `ACTIVATION_RANGE` (~480px) of its trigger x, so foes stay dormant until you approach (not on a timer).
- **Enemy kinds**: `zombie` (rising ground walker), `flyer` (flying chaser, no gravity, sine bob), `ogre` (heavy slow walker, more HP), `plant` (stationary ranged, spits projectiles), `centipede` (fast, fragile ground crawler), `turtle` (slow armored walker that fires straight bullets), `bloated` (stationary caster that lobs an arcing bolt), `boss` (tough walker + spread, HP bar). Shared model in `core/enemies/enemy.ts`; per-kind step routed by `stepEnemy` in `core/enemies/index.ts` (returns `{ enemy, fired }`).
- **Boss / boss variant**: end-of-stage enemy (`core/enemies/boss.ts`). Three escalating **variants** (1–3, one skin per pair of stages) in `BOSS_VARIANTS`: more HP and a wider/faster volley (3-way→5-way). `Enemy.variant` selects stats + the `boss<variant>` skin. Engine emits `game:boss-hp`/`game:boss-cleared` for the HUD bar; clearing it + the wave wins the stage.
- **Theme**: a stage's visual identity (`LevelTheme`: ruins/forest/cave/castle/ice/hell). The engine (`tiles.ts`) maps it to the ground tile and backdrop so each stage looks distinct. See [[0004-level-themes]].
- **Pit / fall-out**: a gap in the ground. Falling below the world bottom (`hasFallenOut`, `core/rules/fall.ts`) costs a life (player) or culls the body (enemies). Ground is built by `floor(width, pits)` with jumpable gaps (≤~85px). Walkers are **ledge-aware** (`chooseDir`/`groundAhead` in `core/enemies/walk.ts`): they turn around at an edge instead of walking into a pit (ranged turtle/boss still aim across it). See [[0005-hazards-and-pits]].
- **Hazard**: a damaging zone (spikes/lava) — `LevelDef.hazards: AABB[]`. Contact hurts the player via `touchesHazard` (`core/rules/hazard.ts`), folded into the normal damage/i-frame path.
- **Stage timer**: per-stage countdown (`core/level/timer.ts`); time-out costs a life. Emits `game:time-changed`.
- **Level / `LevelDef`**: pure-data stage definition (`core/level/level.ts`) — theme, world width, player start, solids (built via `floor(width, pits)`), ladders, spawns, hazards, duration. `LEVELS` is the ordered list. The engine builds the scene from it.
- **Camera scroll**: levels are wider than the screen; the Phaser camera follows the player within `[0, worldWidth]`. Clearing a level advances to the next (carrying lives/score via `scene.restart`); the last → `game:won`.
- **Enemy projectile**: projectile fired by a ranged enemy (e.g. plant) that damages the player; resolved by `resolveEnemyProjectiles` in `core/rules/combat.ts`. Reuses the `Projectile` shape from `core/weapons/weapon.ts`.
- **Greybox**: placeholder art using shapes/rectangles before integrating final assets.
- **One-way / semi-solid platform**: a platform you pass through from below (jumping/climbing) and land on
  from above; never blocks horizontally. Modeled as `Solid { oneWay: true }` in `core/physics/body.ts`. See [[0003-one-way-platforms]].
