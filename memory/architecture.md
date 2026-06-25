# Architecture (stable decisions)

## Three layers, one golden rule

```
core/   → pure logic (TS). No Phaser, no Vue, no DOM. Fully testable, deterministic.
engine/ → Phaser adapter. Renders core state, captures input, plays audio.
ui/     → Vue 3. Menus, HUD, overlays. Mirrors game state, does not own it.
shared/ → types and the event bus (mitt) that connect the layers.
api/    → Vercel serverless function (the global leaderboard) — the ONE backend
          seam. Pure IO adapter: reuses core/ rules, holds no game logic of its own.
```

**Golden rule:** `core/` imports neither Phaser/Vue/Pinia nor touches the DOM. Enforced by ESLint
(`no-restricted-imports`). Reason: to test the bulk of the game headless and deterministically (see ADR 0001).

## Data flow

- **Simulation → UI:** `engine` (or `core`) emits `game:*` events on the bus → Pinia store → HUD.
- **UI → Simulation:** the UI emits `ui:*` commands on the bus → the game reacts.
- Layers NEVER import each other directly; they only share `shared/`.

## Game loop

**Fixed-timestep** simulation (deterministic) + **interpolation** at render (see ADR 0002).
`core/` knows nothing about `requestAnimationFrame`: it receives a fixed `dt` and advances state.

## Determinism

No `Math.random()` or wall-clock time inside `core/`. All randomness goes through `createRng(seed)`
(`core/math/rng.ts`), so the same seed → the same playthrough → reproducible tests.

## Online leaderboard (the one backend seam)

The high-score table is **global**, served by a single Vercel Function (`api/scores.ts`) backed by Upstash
Redis. It is a thin IO adapter: it reuses the pure `core/rules/highscores.ts` rules (`insertScore`,
`parseSubmission`, `normalizeTable`) so the table logic is identical on client and server. The client
(`ui/stores/leaderboard.ts`) hits the **same-origin** `/api/scores` (no CSP change), and `persistence.ts`
keeps a `localStorage` **offline cache** so the board still renders without the network. No user auth, and
credentials live only in server env vars. See ADR 0008.
