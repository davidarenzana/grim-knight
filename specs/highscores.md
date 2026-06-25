# Spec: High score table (top-10, 3-letter initials)

- **Status:** implemented
- **Owner module(s):** `src/core/rules/highscores.ts` (pure table logic + validation), `api/scores.ts` (Vercel Function + Upstash Redis — source of truth), `src/ui/stores/leaderboard.ts` (client), `src/ui/stores/persistence.ts` (offline cache), `src/ui/stores/game.ts` (screen flow)
- **Related:** scoring-lives.md, GDD §8 (scoring), ADR 0008 (online leaderboard)

## Summary

A **global online** arcade ranking: the ten highest scores across all players, each tagged with the
player's three-letter initials, sorted by score (descending) and capped at ten. The pure core owns the
table math and validation (does a score qualify? where does it land? is a submission well-formed?). The
source of truth is the Vercel Function `api/scores.ts` (Upstash Redis, the whole top-ten under one JSON
key), which **reuses the same pure core** to validate and insert. The client (`leaderboard.ts`) calls the
same-origin `/api/scores`; `persistence.ts` keeps a `localStorage` offline cache so the board still renders
without the network; the UI store owns the screen flow.

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

### Scenario: a forged submission is rejected (server-side validation)

- **Given** an untrusted POST body with a negative, NaN, non-integer or over-`MAX_SCORE` score (or an
  out-of-range level/loop)
- **When** `parseSubmission` validates it
- **Then** it returns `null` (the endpoint answers 400 and nothing is stored); a missing/invalid name
  defaults to `"AAA"`

### Scenario: reading the global table

- **Given** the leaderboard endpoint
- **When** the client issues `GET /api/scores`
- **Then** it returns the top-ten (descending), normalized through the pure core; an empty/garbage store
  yields `[]`

### Scenario: submitting a qualifying run

- **Given** a run whose score makes the top ten
- **When** the client `POST`s `{name,score,level,loop}` to `/api/scores`
- **Then** the server validates + inserts via the pure core, persists the new table to Redis, and returns
  `{ table, rank }` with the 0-based rank of the new row

### Scenario: offline degradation

- **Given** the network (or the store) is unavailable
- **When** the player opens the board or submits a run
- **Then** the game does not crash: the board shows the cached/last-seen table (or empty) with an OFFLINE
  note, and a submit optimistically inserts into the cache to sync on the next successful request

## Acceptance criteria

- [x] `MAX_ENTRIES === 10`; the table is always sorted descending and capped at 10.
- [x] `qualifies(table, score)` is true iff the score would land in the top 10.
- [x] `insertScore(table, entry)` returns `{ table, rank }`; rank is the 0-based position, or -1 if it did not qualify.
- [x] Insertion is **stable** on ties (existing entries keep precedence).
- [x] `sanitizeName` always yields 3 chars in `[A-Z ]`, never throws.
- [x] `parseSubmission` rejects forged/garbage submissions; `normalizeTable` cleans an untrusted array.
- [x] All core functions are pure (no DOM, no `localStorage`, no `Math.random`) and immutable — reused by both client and server.
- [x] `api/scores.ts` re-validates every submission server-side and stores the top-ten under one Redis key.
- [x] The client store stays async and falls back to the offline cache on failure (no crash).

## Test mapping

| Scenario          | Test file                           | Test name                                   |
| ----------------- | ----------------------------------- | ------------------------------------------- |
| empty accepts     | `src/core/rules/highscores.test.ts` | `highscores > empty table qualifies any`    |
| qualifies         | `src/core/rules/highscores.test.ts` | `highscores > high score qualifies`         |
| too low           | `src/core/rules/highscores.test.ts` | `highscores > low score rejected`           |
| insert + rank     | `src/core/rules/highscores.test.ts` | `highscores > inserts and reports rank`     |
| tie order         | `src/core/rules/highscores.test.ts` | `highscores > ties keep older ahead`        |
| cap at 10         | `src/core/rules/highscores.test.ts` | `highscores > caps at ten`                  |
| no-op insert      | `src/core/rules/highscores.test.ts` | `highscores > non-qualifying is no-op`      |
| sanitize initials | `src/core/rules/highscores.test.ts` | `highscores > sanitizes initials`           |
| reject forged     | `src/core/rules/highscores.test.ts` | `highscores > parseSubmission ...`          |
| normalize array   | `src/core/rules/highscores.test.ts` | `highscores > normalizeTable ...`           |
| submit (online)   | `src/ui/stores/game.test.ts`        | `game store > submitScore posts the run`    |
| offline submit    | `src/ui/stores/game.test.ts`        | `game store > submitScore degrades offline` |

## Notes / open questions

- The endpoint (`api/scores.ts`) and the `enterscore`/`highscores` screen flow are covered by the store
  tests (fetch mocked to emulate the server) and E2E smoke tests; the pure-core tests above cover the rules.
- The campaign is endless, so only Game Over feeds the table (any run end with a qualifying score).
- Entries also carry `level` and `loop` reached (metadata; not used for ordering).
- **Known limitation:** the leaderboard is anonymous and client-writable, so server validation rejects
  malformed scores but cannot stop a hand-crafted _plausible_ forgery. Acceptable for an arcade demo;
  optional future hardening is Upstash rate-limiting (see ADR 0008).
