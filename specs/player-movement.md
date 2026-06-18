# Spec: Player movement

- **Status:** implemented (walk/run/idle/jump/crouch; climb/throw/hurt/die pending)
- **Owner module(s):** `src/core/fsm/player.ts`, `src/core/physics/`
- **Related:** GDD §3, ADR 0002 (fixed timestep)

## Summary

Ground movement and jumping for the knight, using a fixed-timestep simulation. Horizontal control is
responsive on the ground; the jump arc is near-fixed (limited air control), in the genre's tradition.

## Scenarios (Given / When / Then)

### Scenario: walking

- **Given** a grounded knight at rest
- **When** the "move right" command is held for one fixed step
- **Then** his x position increases by `walkSpeed * dt` and state is `run`

### Scenario: stopping

- **Given** a walking knight
- **When** no movement command is given
- **Then** horizontal velocity returns to 0 and state is `idle`

### Scenario: jump leaves the ground

- **Given** a grounded knight
- **When** the "jump" command is issued
- **Then** vertical velocity becomes the jump impulse and state is `jump`

### Scenario: cannot double-jump

- **Given** an airborne knight
- **When** the "jump" command is issued again
- **Then** nothing happens (no second impulse)

### Scenario: gravity returns him to the ground

- **Given** an airborne knight
- **When** several fixed steps elapse
- **Then** gravity increases downward velocity until he lands and state returns to `idle`

### Scenario: crouch

- **Given** a grounded knight
- **When** the "down" command is held
- **Then** state is `crouch` and he does not move horizontally

## Acceptance criteria

- [ ] Movement is computed per fixed `dt` (no wall-clock time in `core/`).
- [ ] Jump cannot be repeated until grounded again.
- [ ] States: `idle`, `run`, `jump`, `crouch` resolve as above (climb/throw/hurt/die in later specs).
- [ ] Same inputs + same seed produce identical trajectories (determinism).

## Test mapping

| Scenario        | Test file                     | Test name                     |
| --------------- | ----------------------------- | ----------------------------- |
| walking         | `src/core/fsm/player.test.ts` | `player > walks right`        |
| stopping        | `src/core/fsm/player.test.ts` | `player > stops to idle`      |
| jump            | `src/core/fsm/player.test.ts` | `player > jump impulse`       |
| no double-jump  | `src/core/fsm/player.test.ts` | `player > cannot double jump` |
| gravity/landing | `src/core/fsm/player.test.ts` | `player > lands after jump`   |
| crouch          | `src/core/fsm/player.test.ts` | `player > crouches`           |

## Notes / open questions

- Tunables (walkSpeed, jumpImpulse, gravity) live as named constants; values set during greybox feel pass.
