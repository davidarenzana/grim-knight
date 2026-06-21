# Testing strategy plan

> Status: **proposed** (Phase A in progress). This plan is the reference for the testing
> work and is intentionally paired with the upcoming **hexagonal-architecture review** —
> the enabling refactor in §3 _is_ the architecture boundary.

## 1. The gap (why bugs slip through)

| Fact                                       | Evidence                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Coverage measures **`src/core/**` only\*\* | `vitest.config.ts` → `coverage.include`. The "80% green" ignores engine and UI.               |
| Pure core is **well covered**              | 27 files, ~1,800 lines of test over 2,211 lines of core.                                      |
| The engine is **untested**                 | `GameScene.ts` = **1,048 lines, zero tests**. No tests for `session-start.ts`, anims, camera. |
| Integration is **untested**                | Nothing exercises the real loop: spawn → combat → damage → pickup → win → transition.         |
| UI barely tested                           | 3 store smoke tests that only assert the bus is wired, not that values are correct.           |
| **No** E2E / visual regression             | No Playwright/Cypress. Visual bugs (lava, buttons, crouch, HUD) are invisible to tests.       |

**Root cause (and the hexagonal tie-in):** `GameScene.tick()` interleaves the _pure game
orchestration_ (the application logic — testable) with _Phaser effects_
(`cameras.shake`, `playEffect`, `bus.emit`). It therefore can't be tested without a browser,
which is exactly why most of our shipped bugs (soft-locks, dead-pool freeze, win condition,
pickups) live there, blind to the suite.

## 2. The target test pyramid (4 layers; every bug-class has an owner)

| Layer                                                     | Tech                                             | Covers                                                                                         | Bug-class it catches                                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **1. Unit (core)**                                        | Vitest (node) — exists                           | Pure domain functions                                                                          | FSM, physics, rules. Already strong.                                                                                        |
| **2. Integration / "match loop"** _(headless, no Phaser)_ | Vitest (node) — **NEW, top ROI**                 | The whole orchestrated loop: spawn→combat→damage→pickup→score→win→game-over→soft-lock culling  | **Most of our bugs**: enemy under the floor, `scene.restart` freeze, win that never fires, damage not applied, weapon swap. |
| **3. Component / UI**                                     | Vitest + `@vue/test-utils` (jsdom) — dep present | Vue views + store: screen flow menu→levels→playing→pause→gameover, correct HUD values          | Menu/HUD bugs, screen flow, score not reaching the UI.                                                                      |
| **4. E2E + visual regression**                            | **Playwright** — NEW                             | Real browser boot, menu→play→pause→death, Z/X keys, **screenshots** of menus and a stage frame | Visual bugs (floating lava, oversized buttons, static crouch, HUD overlap) and the HMR-freeze class.                        |

### Why Playwright (vs Cypress / Vitest browser mode)

- Drives **real keyboard** (essential for a game: Z/X, arrows) and screenshots the Phaser `<canvas>`.
- Built-in **visual diffing** (`toHaveScreenshot`) → visual regression with no extra tooling.
- Boots the server itself (`vite preview`) via `webServer`, runs headless in CI, multi-browser.
  Cypress is heavier and weaker with canvas; Vitest browser mode is still immature for full-app E2E.

## 3. The enabling refactor (also solves half the hexagonal review)

Extract a pure **application-layer** function out of `GameScene.tick()`:

```ts
// src/core/app/match.ts  (pure domain, no Phaser)
stepMatch(state: MatchState, input: PlayerInput, dt): { state: MatchState; effects: Effect[] }
```

- `Effect[]` = **data** describing presentation effects (`{type:'shake'}`, `{type:'spark',x,y}`,
  `{type:'emit',event,payload}`, `{type:'sound'}`).
- `GameScene` becomes a thin **adapter**: read input → `stepMatch` → render `state` + interpret `effects`.

In hexagonal terms: `stepMatch` is the **use case**; render/audio/bus are **output adapters (ports)**;
the keyboard is an **input port**. This (a) makes Layer 2 fully testable headless and (b) **is the
boundary the hexagonal review is after** — so do it as the first step of that review, not twice.

## 4. Pruning low-value tests — with judgment

The test audit flagged several tests as low-value. After review, the verdict is nuanced:

**Do NOT delete (they cover real branches needed for the 80% core threshold, or guard a bug-class
we actually hit):**

- `level/jumpable.test.ts` (per-level) — the guardrail that prevents hazard-width soft-locks. **Keep.**
- `level/stages/stages.test.ts` — the "spawn doesn't overlap a crate/pillar" invariant **caught the
  enemy-in-crate bug**. **Keep.**
- `math/vector.test.ts` "normalize of zero", `weapons/weapon.test.ts` "cooldown never < 0" — these cover
  real guard **branches**; deleting them drops branch coverage. **Keep.**
- `ui/stores/game.test.ts` — weak, but the only UI tests. **Upgrade** in Layer 3, don't delete.

**Safe to merge/trim later (pure duplicates, ~negligible savings):** the repeated `loop` alpha-range
property iterations and the two `timer` no-re-expire assertions. Bundled into Layer 2's test
restructuring to avoid churning the files twice.

Net: the noise is small and the risk of over-pruning (coverage regressions) outweighs it. The real win
is closing the engine/integration/visual gap, not deleting unit tests.

## 5. Bugs we'd have caught directly

| Shipped bug                                                     | Layer that catches it                                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Enemy inside a crate → stage never clears                       | Already covered by `stages.test.ts` (added after the fact) — **keep**                                |
| Enemy under the floor (soft-lock)                               | Layer 2 (headless match loop: "every enemy stays reachable / is culled")                             |
| Freeze after `scene.restart` (dead pools)                       | Layer 2 (restart a match and keep stepping without throwing) + Layer 4 (E2E: kill boss → next stage) |
| Win / transition never fires                                    | Layer 2                                                                                              |
| Damage / knockback not applied to the player                    | Layer 2                                                                                              |
| Floating lava / oversized buttons / static crouch / HUD overlap | Layer 4 (visual regression)                                                                          |
| Score not rising in the UI                                      | Layer 3 (round-trip event → store → HUD)                                                             |

## 6. Phased rollout

- **Phase A — honest coverage + (deferred) prune** _(low effort, no architecture)_: report coverage for
  engine/ui (enforce only core via per-glob thresholds) so the gap is visible. **← in progress.**
- **Phase B — `stepMatch` refactor + integration tests** _(top value; part of the hexagonal review)_:
  extract the orchestrator; headless tests for the match loop covering every past
  soft-lock/win/damage/pickup bug. Restructure/trim the unit tests here.
- **Phase C — Vue component tests** (Layer 3): screen flow + HUD/store values.
- **Phase D — Playwright** (Layer 4): E2E smoke (menu→play→pause→death) + screenshot baseline
  (menus + a stage frame).
- **CI/hooks:** wire new suites into CI and/or pre-push (E2E is too slow for pre-commit).

## 7. Open decisions

1. **Adopt Playwright?** Adds a browser dep + CI time, but is the only way to catch the visual/E2E class.
2. **`stepMatch` refactor timing:** recommended as the **first step of the hexagonal review** (same boundary).
3. Phase A is safe to land now; B–D follow the architecture review.
