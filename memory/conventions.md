# Conventions and gotchas

## Code

- TypeScript strict (incl. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). No `any` unless
  documented and justified.
- Imports via aliases: `@core/*`, `@engine/*`, `@ui/*`, `@shared/*`, `@/*`.
- Pure functions and immutable data in `core/` whenever reasonable (eases testing).
- No `Math.random()` or `Date.now()` in `core/`: use `createRng(seed)` and an injected clock/`dt`.
- Project language is English: code, comments, docs, specs, UI strings.

## Tests

- Vitest with `globals: true` (no need to import `describe/it/expect`, though we do for clarity).
- Test next to the code: `module.test.ts`.
- Tests that need DOM/jsdom: add a docblock `// @vitest-environment jsdom` at the top of the test file (Vitest 3 deprecated `environmentMatchGlobs`; the default env is `node`).
- Coverage measured only over `src/core/**` (threshold ≥80% lines). Render/UI is covered with smoke tests.

## Git / commits

- Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `build:`, `ci:`.
- Hooks (Husky): `pre-commit` → lint-staged (eslint --fix + prettier); `commit-msg` → commitlint.

## Known gotchas

- Phaser must only be instantiated on the client (inside `GameCanvas.vue`'s `onMounted`); never in `core/` or node tests.
- **Vite/Vitest version alignment:** keep Vitest on v3 so it pulls Vite 6 (matching `@vitejs/plugin-vue` 5 and our `vite` dep). Vitest 2 pulls Vite 5, producing two Vite copies whose `Plugin` types clash under `exactOptionalPropertyTypes` and break `vue-tsc` on `vitest.config.ts`.
- **pnpm 11 build approvals:** dependency build scripts (esbuild, vue-demi) are ignored until approved. The approval lives in `pnpm-workspace.yaml` under `allowBuilds:` (the `pnpm` field in `package.json` is no longer read). Without it, `pnpm install` exits non-zero and blocks scripts.
- **husky must be a real devDependency.** Referencing it only in the `prepare` script is not enough; declare `husky` in `devDependencies`. `prepare` is `husky || true` so a missing binary never aborts install.
- Vue SFC component names must be multi-word (`vue/multi-word-component-names`): use `GameHud`, not `Hud`.
- **Procedural art (`engine/assets/textures.ts`):** sprites/tiles are drawn with a `scene.make.graphics(..., false)`
  (NOT added to the display list) and baked via `generateTexture(key, w, h)`; call `generateTextures(this)` at
  the top of `create()`. GameScene renders `this.add.image(...)`/`tileSprite(...)` by `TEX.*` key + entity body
  size. To swap in real PNGs later, preload them under the same `TEX.*` keys — no render-code change. Textures
  are drawn at core body sizes (knight 24×48, zombie 24×40, flyer 28×20, ogre 40×56, plant 28×32, boss 64×80)
  and shown via `setDisplaySize`; facing via `setFlipX`; hit-flash via `setTintFill`/`clearTint`.
- **`exactOptionalPropertyTypes: true`:** never assign `undefined` to an optional field; spread it in
  conditionally (`...(x !== undefined ? { k: x } : {})`).
- (Add every new gotcha discovered here — living project.)
