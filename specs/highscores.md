# Spec: High score table (top-10, 3-letter initials)

- **Status:** implemented
- **Owner module(s):** `src/core/rules/highscores.ts` (pure table logic), `src/ui/stores/persistence.ts` (localStorage), `src/ui/stores/game.ts` (screen flow)
- **Related:** scoring-lives.md, GDD §8 (scoring), the audio-pref `localStorage` pattern in `persistence.ts`

## Summary

A classic arcade ranking: the ten highest scores ever achieved, each tagged with the player's
three-letter initials. The table is sorted by score (descending) and capped at ten entries.
The pure core owns the table math (does a score qualify? where does it land? how do initials get
sanitized?); `persistence.ts` owns persistence (`localStorage`, key `grim:highscores`) and the UI store owns the screen flow.

## Scenarios (Given / When / Then)

### Scenario: empty table accepts any score

- **Given** an empty table
- **When** a score of 0 is checked with `qualifies`
- **Then** it qualifies (there is room)

### Scenario: a high enough score qualifies

- **Given** a full table (10 entries) whose lowest score is 1000
- **When** a score of 1500 is checked
- **Then** it qualifies

### Scenario: too low a score does not qualify

- **Given** a full table whose lowest score is 1000
- **When** a score of 500 is checked
- **Then** it does not qualify

### Scenario: inserting sorts and reports the rank

- **Given** a table `[2000, 1000]`
- **When** `insertScore` adds an entry with score 1500
- **Then** the table is `[2000, 1500, 1000]` and the returned rank is 1 (0-based)

### Scenario: ties keep existing entries ahead

- **Given** a table containing a 1000-point entry
- **When** a new 1000-point entry is inserted
- **Then** the new entry lands **after** the existing one (stable; older keeps the higher rank)

### Scenario: the table never exceeds ten entries

- **Given** a full table of 10 entries
- **When** a qualifying entry is inserted
- **Then** the table still has 10 entries and the previous lowest is dropped

### Scenario: a non-qualifying insert is a no-op

- **Given** a full table whose lowest score is 1000
- **When** `insertScore` adds a 500-point entry
- **Then** the table is unchanged and the returned rank is -1

### Scenario: initials are sanitized to three A-Z letters

- **Given** a raw name `"ab"`, `"david"`, `"a1!"` or `""`
- **When** `sanitizeName` is applied
- **Then** it returns exactly 3 uppercase A-Z chars, padding short names (e.g. `"AB "` → trailing
  space allowed) and truncating long ones (`"DAV"`); empty/invalid falls back to `"AAA"`

## Acceptance criteria

- [ ] `MAX_ENTRIES === 10`; the table is always sorted descending and capped at 10.
- [ ] `qualifies(table, score)` is true iff the score would land in the top 10.
- [ ] `insertScore(table, entry)` returns `{ table, rank }`; rank is the 0-based position, or -1 if it did not qualify.
- [ ] Insertion is **stable** on ties (existing entries keep precedence).
- [ ] `sanitizeName` always yields 3 chars in `[A-Z ]`, never throws.
- [ ] All functions are pure (no DOM, no `localStorage`, no `Math.random`) and immutable.

## Test mapping

| Scenario          | Test file                           | Test name                                |
| ----------------- | ----------------------------------- | ---------------------------------------- |
| empty accepts     | `src/core/rules/highscores.test.ts` | `highscores > empty table qualifies any` |
| qualifies         | `src/core/rules/highscores.test.ts` | `highscores > high score qualifies`      |
| too low           | `src/core/rules/highscores.test.ts` | `highscores > low score rejected`        |
| insert + rank     | `src/core/rules/highscores.test.ts` | `highscores > inserts and reports rank`  |
| tie order         | `src/core/rules/highscores.test.ts` | `highscores > ties keep older ahead`     |
| cap at 10         | `src/core/rules/highscores.test.ts` | `highscores > caps at ten`               |
| no-op insert      | `src/core/rules/highscores.test.ts` | `highscores > non-qualifying is no-op`   |
| sanitize initials | `src/core/rules/highscores.test.ts` | `highscores > sanitizes initials`        |

## Notes / open questions

- Persistence (`localStorage`) and the `enterscore`/`highscores` screen flow live in the UI store and
  are covered by store/E2E smoke tests, not the pure-core tests above.
- Both Game Over and Victory feed the table (any run end with a qualifying score).
- Entries also carry `level` and `loop` reached (metadata; not used for ordering).
