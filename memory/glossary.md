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
- **Spawn / spawner**: enemy spawn point/rule. `core/level/spawner.ts` schedules timed `SpawnEvent`s; the engine instantiates them.
- **Enemy kinds**: `zombie` (rising ground walker), `flyer` (flying chaser, no gravity, sine bob), `ogre` (heavy slow walker, more HP). Shared model in `core/enemies/enemy.ts`; per-kind step routed by `stepEnemy` in `core/enemies/index.ts`.
- **Greybox**: placeholder art using shapes/rectangles before integrating final assets.
- **One-way / semi-solid platform**: a platform you pass through from below (jumping/climbing) and land on
  from above; never blocks horizontally. Modeled as `Solid { oneWay: true }` in `core/physics/body.ts`. See [[0003-one-way-platforms]].
