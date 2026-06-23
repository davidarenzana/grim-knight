# Spec: Moving platforms

- **Status:** implemented
- **Owner module(s):** `src/core/physics/platform.ts`, `src/core/app/match.ts`
- **Related:** GDD (Haunted Forest mechanic), ADR 0002 (fixed-step sim), ADR 0003 (one-way platforms), `specs/player-movement.md`

## Summary

Kinematic platforms that travel back and forth along a straight path (horizontal,
vertical or diagonal) and **carry the knight** when he rides on top. They add
traversal challenge to the Haunted Forest tower — a shelf you must time and ride
between zones. Platforms are pure, deterministic state advanced one fixed step at
a time; the engine only renders/interpolates them.

A platform is a one-way (semi-solid) collider: the knight can jump up through it
and land on top, and standing on it he is moved by the platform's per-step delta.
Platforms affect the **player only** (enemies and projectiles use static geometry).

## Scenarios (Given / When / Then)

### Scenario: oscillates between endpoints

- **Given** a platform from A to B with a speed
- **When** it is stepped over time
- **Then** its position advances toward B at `speed` px/s, and once it reaches B it
  reverses toward A (and back), never overshooting an endpoint

### Scenario: deterministic

- **Given** the same platform and `dt`
- **When** `stepPlatform` is called
- **Then** the result is identical every time (no wall-clock, no randomness)

### Scenario: a single step never overshoots an endpoint

- **Given** a platform within one step's travel of its target endpoint
- **When** it is stepped
- **Then** it snaps exactly to the endpoint and flips direction (no jitter past it)

### Scenario: the knight rides a horizontal platform

- **Given** the knight standing on top of a platform moving horizontally
- **When** the match steps with no input
- **Then** the knight is carried the same horizontal distance as the platform
  (he stays on it instead of sliding off)

### Scenario: the knight rides a vertical platform

- **Given** the knight standing on top of a platform moving up/down
- **When** the match steps with no input
- **Then** the knight stays resting on the platform's top surface (carried
  vertically), grounded

### Scenario: only the rider is carried

- **Given** the knight on solid ground next to (not on) a moving platform
- **When** the match steps
- **Then** the knight is unaffected by the platform's movement

### Scenario: jumping off releases the rider

- **Given** the knight riding a platform
- **When** he jumps
- **Then** he leaves the platform under his own velocity (no longer carried)

## Acceptance criteria

- [ ] `stepPlatform` oscillates between endpoints, snaps without overshoot, and is pure
- [ ] A platform exposes a one-way `Solid` the knight can land on (`platformSolid`)
- [ ] A grounded rider is translated by the platform's per-step delta before its own physics step
- [ ] A non-rider (airborne, or grounded elsewhere) is not translated
- [ ] `MatchState` carries live platforms; `createMatch` instantiates them from the `LevelDef`
- [ ] Haunted Forest gains at least one moving platform; engine renders + interpolates it
- [ ] typecheck, lint and the full test suite stay green

## Test mapping

| Scenario                     | Test file                           | Test name                                                 |
| ---------------------------- | ----------------------------------- | --------------------------------------------------------- |
| oscillates between endpoints | `src/core/physics/platform.test.ts` | `stepPlatform > advances toward the target endpoint`      |
| reverses at endpoints        | `src/core/physics/platform.test.ts` | `stepPlatform > reverses at an endpoint`                  |
| no overshoot                 | `src/core/physics/platform.test.ts` | `stepPlatform > snaps to the endpoint without overshoot`  |
| deterministic                | `src/core/physics/platform.test.ts` | `stepPlatform > is deterministic`                         |
| rides a horizontal platform  | `src/core/app/match.test.ts`        | `stepMatch > carries the knight on a horizontal platform` |
| only the rider is carried    | `src/core/app/match.test.ts`        | `stepMatch > leaves a knight off the platform alone`      |

## Notes / open questions

- Path is a single segment A↔B. Multi-waypoint paths are out of scope for now.
- Enemies and projectiles ignore moving platforms (static geometry only); revisit
  if a future stage needs enemies to ride.
- Carry uses the platform's previous position to decide who is riding (where the
  knight currently rests), then applies the new step's delta.
