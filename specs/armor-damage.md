# Spec: Armor damage (2-hit model)

- **Status:** implemented
- **Owner module(s):** `src/core/rules/armor.ts`
- **Related:** GDD §3, glossary (Armor), `shared/events.ts:ArmorState`

## Summary

The knight survives a single hit by losing his armor, and dies on the second. Armor pickups restore the
suit. This is the signature survivability mechanic of the genre.

## Scenarios (Given / When / Then)

### Scenario: first hit strips the armor

- **Given** a knight in state `armored`
- **When** he takes a hit
- **Then** his state becomes `underwear` and he is still alive

### Scenario: second hit kills

- **Given** a knight in state `underwear`
- **When** he takes a hit
- **Then** his state becomes `dead`

### Scenario: armor pickup restores the suit

- **Given** a knight in state `underwear`
- **When** he picks up an armor power-up
- **Then** his state becomes `armored`

### Scenario: damage while dead is a no-op

- **Given** a knight in state `dead`
- **When** he takes a hit
- **Then** his state remains `dead`

### Scenario: brief invulnerability after a hit (i-frames)

- **Given** a knight that was just hit
- **When** another hit lands within the invulnerability window
- **Then** the second hit is ignored

## Acceptance criteria

- [ ] State transitions follow `armored → underwear → dead` and never skip or reverse except via pickup.
- [ ] An armor pickup sets state to `armored` from any living state.
- [ ] Hits during the i-frame window do not change state.
- [ ] Each state change emits `game:armor-changed` (verified at the engine boundary, not in `core/`).

## Test mapping

| Scenario         | Test file                      | Test name                              |
| ---------------- | ------------------------------ | -------------------------------------- |
| first hit strips | `src/core/rules/armor.test.ts` | `armor > first hit -> underwear`       |
| second hit kills | `src/core/rules/armor.test.ts` | `armor > second hit -> dead`           |
| pickup restores  | `src/core/rules/armor.test.ts` | `armor > pickup -> armored`            |
| dead is no-op    | `src/core/rules/armor.test.ts` | `armor > damage while dead`            |
| i-frames         | `src/core/rules/armor.test.ts` | `armor > ignores hits during i-frames` |

## Notes / open questions

- i-frame duration: tentatively 1.0 s (tunable constant). Confirm against feel in greybox.
