# 0008 — Online leaderboard (Vercel Function + Upstash Redis)

Status: accepted · 2026-06-25

## Context

The high-score table shipped in v1.0 was **per-browser** (`localStorage`, key `grim:highscores`):
a player on another device saw an empty board. To make the game feel complete and competitive — and to
invite other people to play and beat each other's runs — the table needed to become a **shared global
leaderboard**.

A static site (the game is a Vite SPA on Vercel) can _read_ a JSON file but cannot _write_ one at runtime,
so a writable shared store of some kind is unavoidable. Options weighed: a read-only seeded
`public/highscores.json` (no live writes), a third-party JSON SaaS (key exposed in client, fragile),
Supabase / Firebase (BaaS, real but external account + CSP changes), and a Vercel Function backed by a
key-value store.

## Decision

**Add one Vercel Function (`api/scores.ts`) backed by Upstash Redis** (the successor to "Vercel KV",
installed from the Vercel Marketplace; Vercel KV first-party was retired in Dec 2024).

- `GET /api/scores` → the top-10. `POST /api/scores` `{name,score,level,loop}` → validate, insert, persist,
  return `{table, rank}`.
- The whole top-ten is stored under **one key** as a JSON value → ≤1 GET + 1 SET per request, so usage is
  microscopic against the Upstash **free tier** (256 MB / 500k commands per month). Staying free was a hard
  requirement.
- **The pure core is the single source of truth for table rules.** `api/scores.ts` imports
  `insertScore` / `parseSubmission` / `normalizeTable` from `src/core/rules/highscores.ts` (added
  `parseSubmission` + `normalizeTable` + `MAX_SCORE` there). No duplicated logic; the golden rule (pure
  core, no IO) is intact — the function is the IO adapter, the core stays pure.
- **Client:** `src/ui/stores/leaderboard.ts` (`fetchScores`/`postScore`) calls the **same-origin** endpoint,
  so the CSP needs **no change** (`connect-src 'self'` already allows it). `persistence.ts` keeps the audio
  pref and is repurposed as an **offline cache** of the last-seen table; the store (`game.ts`) goes async
  and degrades gracefully (cached/empty board, `scoresError` flag) when the network or the store is down.

### Why this over the alternatives

- **vs. read-only JSON** — that can't accept live submissions, which is the whole point.
- **vs. Supabase/Firebase** — those are external origins (CSP edit), need a separate account, and put an
  anon key in the client. The Vercel Function is same-origin, same repo, same deploy, and credentials live
  only in server env vars (never shipped to the browser).
- **vs. a JSON SaaS** — those expose a write key in the client and offer weak durability guarantees.

## Consequences

- The TFM narrative changes from "fully static, no backend" to "static SPA **+ one serverless function** for
  the global leaderboard; still no user auth and no secrets in the client." Reflected in README / AGENTS /
  GDD / glossary / architecture and `specs/highscores.md`.
- **New attack surface:** an anonymous, client-writable endpoint. Mitigations: every field re-validated
  server-side (`parseSubmission` rejects NaN/negative/non-integer/over-`MAX_SCORE` scores and out-of-range
  level/loop; names sanitized to 3 `[A-Z ]`), and the table is capped at 10. **Known limitation:** without
  auth, a hand-crafted POST with a _plausible_ score can still forge an entry — acceptable for an arcade demo;
  documented rather than fully solved. Optional future hardening: Upstash rate-limiting.
- **Local dev:** `pnpm dev` (Vite only) does not run the function, so the board shows empty/cached and the
  game still works; full local testing uses `vercel dev` after `vercel env pull`. The Upstash integration is
  connected once in the Vercel dashboard, which injects `KV_REST_API_URL`/`KV_REST_API_TOKEN`
  (or `UPSTASH_REDIS_REST_URL`/`_TOKEN`) — read by `api/scores.ts`, never committed (`*.local` is gitignored).
- `api/` is typechecked via its own `api/tsconfig.json` (Node types) wired into `pnpm typecheck`; Vercel
  compiles the function independently at deploy.
- See [[0001-engine-core-ui-split]] (golden rule reused server-side) and [[0006-hexagonal-application-layer]]
  (effects/IO at the edges, pure core in the middle).
