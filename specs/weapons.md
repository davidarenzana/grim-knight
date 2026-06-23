# Spec: Weapons (projectile model + weapon variety)

- **Status:** implemented (lance, dagger, torch, axe)
- **Owner module(s):** `src/core/weapons/weapon.ts`
- **Related:** GDD §3 (weapons), glossary (Weapon)

## Summary

The knight throws the active weapon as a projectile. A weapon has a speed, a fire-rate cooldown and a
limit of simultaneous projectiles on screen. The lance is the straight, reliable default. Other weapons
reuse the same model with extra data: **arc** (gravity + an upward launch velocity, e.g. torch/axe) and
**limited reach** (a max travel distance before the projectile is culled, e.g. the short-range dagger).
Weapons are swapped via the `WEAPONS` registry (`nextWeapon`/`weaponById`); chests will pick from it.

**Ownership.** The knight owns a subset of the registry: a run starts with `STARTING_WEAPONS`
(dagger + torch) and swap (`nextOwnedWeapon`) cycles only the owned ids. Weapon chests/drops add new
ids; the arsenal carries across stage transitions. **Losing a life resets the arsenal** back to
`STARTING_WEAPONS` with the dagger active — earned weapons are lost on death (arcade-style).

## Scenarios (Given / When / Then)

### Scenario: firing spawns a projectile

- **Given** a fresh lance weapon (cooldown 0) and the knight facing right
- **When** `fire` is called
- **Then** one projectile exists, moving right at the weapon's speed, and the cooldown is set

### Scenario: cannot fire during cooldown

- **Given** a weapon that just fired (cooldown > 0)
- **When** `fire` is called again
- **Then** no new projectile is spawned

### Scenario: respects the on-screen limit

- **Given** a weapon already at `maxOnScreen` projectiles (cooldown 0)
- **When** `fire` is called
- **Then** no new projectile is spawned

### Scenario: projectiles move and cooldown decays

- **Given** a weapon with one projectile and cooldown remaining
- **When** `stepWeapon` advances by `dt`
- **Then** the projectile moved by `vel * dt` and the cooldown decreased by `dt`

### Scenario: out-of-bounds projectiles are culled

- **Given** a projectile past the world's right edge
- **When** `stepWeapon` advances
- **Then** that projectile is removed

### Scenario: arcing weapons fall under gravity

- **Given** an arcing weapon (gravity > 0, launchVy > 0) fired horizontally
- **When** `stepWeapon` advances over several steps
- **Then** the projectile first rises, then gains downward velocity and falls below the launch height

### Scenario: straight weapons keep a flat trajectory

- **Given** the lance (gravity 0) fired horizontally
- **When** `stepWeapon` advances
- **Then** the projectile's vertical velocity stays 0 (no arc)

### Scenario: short-reach weapons are culled past their max range

- **Given** a dagger (limited `maxRange`) fired
- **When** `stepWeapon` advances past that distance
- **Then** the projectile is removed even while still on screen

### Scenario: weapon registry cycles weapons

- **Given** the `WEAPONS` registry
- **When** `nextWeapon` is called repeatedly from the lance
- **Then** it cycles through all weapons and wraps around; `weaponById` resolves by id

### Scenario: respawn resets the arsenal to the starting kit

- **Given** a playing match where the knight has earned extra weapons (e.g. the axe is active and owned)
- **When** the knight dies with lives remaining and respawns
- **Then** `ownedWeapons` is back to `STARTING_WEAPONS` (dagger + torch), the dagger is active, and a
  `weapon` notification fires so the HUD updates

## Acceptance criteria

- [x] `fire` honors cooldown and `maxOnScreen`; sets velocity by `facing`; sets arc (vy/gravity) and reach.
- [x] `stepWeapon` integrates projectiles under per-projectile gravity, decays cooldown (never below 0),
      culls out-of-bounds, wall hits and projectiles past their max range.
- [x] `WEAPONS` registry + `nextWeapon`/`weaponById` for swapping; lance/dagger/torch/axe defined.
- [x] `STARTING_WEAPONS` (dagger + torch) is the initial **and** respawn arsenal; `handleDeath` resets
      `ownedWeapons`/`activeWeapon` to it on respawn and emits a `weapon` notification.
- [x] Pure and deterministic (no wall-clock time, no globals).
- [x] `Projectile.sprite?` carries an optional presentation tag (e.g. enemy shots `spore`/`bullet`/`bolt`/
      `fire`); pure data only — the engine maps it to art (`enemyProjectileVisual`), rect fallback otherwise.
- [x] `advanceProjectilesDetailed` returns `{ alive, culled }` with a `CullReason` (`wall`/`bounds`/`range`)
      so the engine can spark wall impacts; `advanceProjectiles` is a thin wrapper returning `.alive`.

## Test mapping

| Scenario   | Test file                         | Test name                                                                     |
| ---------- | --------------------------------- | ----------------------------------------------------------------------------- |
| fire spawn | `src/core/weapons/weapon.test.ts` | `weapon > fire spawns projectile`                                             |
| cooldown   | `src/core/weapons/weapon.test.ts` | `weapon > cannot fire on cooldown`                                            |
| max screen | `src/core/weapons/weapon.test.ts` | `weapon > respects maxOnScreen`                                               |
| step       | `src/core/weapons/weapon.test.ts` | `weapon > step moves and decays`                                              |
| cull       | `src/core/weapons/weapon.test.ts` | `weapon > culls out of bounds`                                                |
| arc        | `src/core/weapons/weapon.test.ts` | `weapon > arcing weapons fall`                                                |
| flat       | `src/core/weapons/weapon.test.ts` | `weapon > straight stays flat`                                                |
| reach      | `src/core/weapons/weapon.test.ts` | `weapon > culls past max range`                                               |
| registry   | `src/core/weapons/weapon.test.ts` | `weapon > registry cycles`                                                    |
| respawn    | `src/core/app/match.test.ts`      | `stepMatch > respawn resets the arsenal to the starting kit (dagger + torch)` |
