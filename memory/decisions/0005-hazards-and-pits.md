# ADR 0005 — Pits (fall-out) and hazards

- **Status:** accepted
- **Date:** 2026-06-19

## Context

To resemble the classic Ghosts'n Goblins maps, stages needed gaps to jump and
damaging terrain. The ground was a single full-width solid (no way to fall out)
and there was no contact-damage terrain.

## Decision

Two small, pure rules in `core/rules/`, kept separate so they compose cleanly:

- **Fall-out** (`fall.ts`): `hasFallenOut(body, deathY)` = `body.pos.y > deathY`.
  The ground is now built by `floor(worldWidth, pits)` which carves jumpable
  gaps (≤~85px; a jump clears ~90px). Each tick the engine checks the player
  (→ lose a life / respawn / game-over via the existing flow) and every enemy
  (→ culled to `dead`, so a chaser that walks off a ledge can't drop forever and
  block the stage-clear).
- **Hazards** (`hazard.ts`): `touchesHazard(playerBox, hazards)` over
  `LevelDef.hazards: AABB[]`. A hit is folded into the player's `damaged` input,
  so i-frames/knockback are handled by the armor FSM exactly like an enemy hit.
  Hazards sit on solid ground (a trap strip you jump over), distinct from pits.

The engine picks the hazard tile by theme (`hazardKey`: lava in hell, spikes
elsewhere). Invariant tests in `level.test.ts` assert nothing must-stand spawns
over a pit and every gap stays jumpable.

## Consequences

- (+) Pits and hazards reuse the existing death/damage flows — no new HUD/FSM.
- (+) `floor()` + invariant tests make it hard to author an impassable stage.
- (−) Hazards damage (armor) rather than instant-kill like GnG water/lava; fine
  for now (revisit if we want instant-death pools).
