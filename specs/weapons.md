# Spec: Weapons (projectile model, starting with the lance)

- **Status:** implemented (lance; other weapons reuse the same model)
- **Owner module(s):** `src/core/weapons/weapon.ts`
- **Related:** GDD §3 (weapons), glossary (Weapon)

## Summary

The knight throws the active weapon as a projectile. A weapon has a speed, a fire-rate cooldown and a
limit of simultaneous projectiles on screen. The lance is the straight, reliable default.

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

## Acceptance criteria

- [x] `fire` honors cooldown and `maxOnScreen`; sets velocity by `facing`.
- [x] `stepWeapon` integrates projectiles, decays cooldown (never below 0), culls out-of-bounds.
- [x] Pure and deterministic (no wall-clock time, no globals).

## Test mapping

| Scenario   | Test file                         | Test name                          |
| ---------- | --------------------------------- | ---------------------------------- |
| fire spawn | `src/core/weapons/weapon.test.ts` | `weapon > fire spawns projectile`  |
| cooldown   | `src/core/weapons/weapon.test.ts` | `weapon > cannot fire on cooldown` |
| max screen | `src/core/weapons/weapon.test.ts` | `weapon > respects maxOnScreen`    |
| step       | `src/core/weapons/weapon.test.ts` | `weapon > step moves and decays`   |
| cull       | `src/core/weapons/weapon.test.ts` | `weapon > culls out of bounds`     |
