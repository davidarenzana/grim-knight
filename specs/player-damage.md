# Spec: Player damage states (hurt, die, throw)

- **Status:** implemented
- **Owner module(s):** `src/core/fsm/player.ts`, `src/core/rules/armor.ts`
- **Related:** armor-damage.md, weapons.md

## Summary

The player embeds its `Armor`. When a hit lands (`world.damaged`), the knight enters a brief `hurt`
state with knockback and i-frames; a fatal hit puts him in `die`. Throwing the weapon shows a short
`throw` state. These states gate or modify control.

## Scenarios (Given / When / Then)

### Scenario: taking a hit -> hurt + knockback

- **Given** an armored knight facing right
- **When** a hit lands this step
- **Then** armor becomes `underwear`, state is `hurt`, and he is knocked back (away from facing)

### Scenario: i-frames ignore rapid second hit

- **Given** a knight just hurt (in i-frames)
- **When** another hit lands the next step
- **Then** the armor state does not change again

### Scenario: fatal hit -> die

- **Given** a knight in `underwear` past his i-frames
- **When** a hit lands
- **Then** armor becomes `dead` and state is `die`

### Scenario: throwing shows the throw state

- **Given** a grounded, unharmed knight
- **When** "attack" is pressed
- **Then** state is `throw` for a short window

## Acceptance criteria

- [x] `world.damaged` applies one armor `hit`, honoring i-frames.
- [x] A landed non-fatal hit sets `hurt` + knockback; a fatal hit sets `die`.
- [x] Movement input is ignored while hurting.
- [x] `attack` sets a short `throw` window (visual state) when able to act.

## Test mapping

| Scenario | Test file                     | Test name                        |
| -------- | ----------------------------- | -------------------------------- |
| hurt     | `src/core/fsm/player.test.ts` | `player > hurt and knockback`    |
| i-frames | `src/core/fsm/player.test.ts` | `player > i-frames block hit`    |
| die      | `src/core/fsm/player.test.ts` | `player > dies on fatal hit`     |
| throw    | `src/core/fsm/player.test.ts` | `player > throw state on attack` |
