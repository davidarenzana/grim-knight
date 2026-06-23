# 0007 — Module decomposition + named constants (no magic numbers)

Status: accepted · 2026-06-23

## Context

Two files had grown into "do-everything" units: `engine/scenes/GameScene.ts` (~795
lines) and `core/app/match.ts` (~623 lines). Both also carried scattered magic
numbers (shake/vfx tunables, pixel offsets, tween durations, depths, colors), and
the Vue views hardcoded ~35 hex colors. A few empty scaffold folders lingered
(`core/entities`, `engine/audio`, and the unused `engine/input` + `engine/render`).

The hexagonal boundary itself was already sound (ESLint-enforced core purity,
effects-as-data output port — see [[0006-hexagonal-application-layer]]); this was a
hygiene/altitude pass, not an architecture change.

## Decision

**Split the two orchestrators along their existing seams, no behavior change:**

- `core/app/match.ts` keeps the `stepMatch`/`createMatch` orchestration; its
  cohesive helpers moved to siblings that the use case composes:
  - `core/app/spawn.ts` — `bossVariant` / `scaleEnemy` / `spawnEnemy`
  - `core/app/rewards.ts` — `applyReward` (+ `AppliedReward`)
  - `core/app/lifecycle.ts` — `handleDeath` / `bossNotifications`
  - `core/app/effects.ts` — `notify` / `hexColor` shared by the above
- `engine/scenes/GameScene.ts` becomes a thin orchestrator (~360 lines). The
  previously-empty scaffold folders are now filled with the layer they were meant
  for:
  - `engine/input/keymap.ts` — key bindings + `readInput` + edge-detected swap
  - `engine/render/WorldRenderer.ts` — owns every dynamic sprite pool + render-only
    juice trackers; syncs them to `MatchState` each frame
  - `engine/render/sprites.ts` — pure `applySprite` / `enemyAnim` / `knightAnim`

**Named constants, one place per layer (no inline magic numbers):**

- `core/app/tuning.ts` — gameplay + emitted-presentation values (shake presets,
  vfx scales, world-wall geometry, loot/score, float-label offsets/colors). These
  are part of the output port: the core emits them as DATA.
- `engine/render/theme.ts` — adapter-side presentation tokens (depths, tween
  durations, fonts, colors, scales, pixel pads, RNG seed-mix multipliers).
- `ui/style.css` `:root` — semantic CSS custom properties for the whole UI palette;
  the Vue views reference `var(--token)` instead of hex literals.

## Consequences

- Each file reads at one altitude; the orchestrators show _what_ happens, the
  helpers/constants show _how much_. Designers tune one file per layer.
- `@core/app` barrel re-exports `tuning`, so external consumers (e.g. `FIXED_DT`)
  are unchanged.
- Gotcha discovered: a Phaser `Scene` already has a `renderer` property, so the
  scene's `WorldRenderer` field is named `world`, not `renderer`.
- The only hardcoded colors left are SVG `fill="#…"` presentation attributes in
  templates, where CSS custom properties don't apply.
- 289 Vitest tests + typecheck + lint + build all green; color values kept
  byte-identical so the visual-regression baselines are untouched.
