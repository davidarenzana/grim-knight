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
- **Scenery art (`engine/assets/tiles.ts`):** CraftPix "Cartoon Medieval Ruins" PNGs under
  `public/assets/tiles/`, loaded in `preload()` via `preloadTiles` (`TILE.*` keys, `backgroundFor(level)`).
  GameScene routes solids in the geometry loop: one-way→`TILE.platform` (tileSprite), wide(≥200px)→`TILE.ground`
  (tileSprite), small→`TILE.crate` (image). Ladder/chest are stretched images; background is a static
  full-screen image at depth −1000, `scrollFactor(0)`. (The old procedural `textures.ts`/`generateTexture`
  approach was fully replaced and deleted; only projectiles stay as plain rectangles.)
- **`exactOptionalPropertyTypes: true`:** never assign `undefined` to an optional field; spread it in
  conditionally (`...(x !== undefined ? { k: x } : {})`).
- **`scene.restart()` destroys all GameObjects** — any pooled-object array kept as a scene field (sprite/rect
  render pools) holds DEAD references afterwards. Reset every pool array to `[]` in `create()`, or the next
  frame's render touches destroyed objects and throws every frame → the game looks frozen. (This caused the
  "kill the boss → stuck on the next stage" bug.)
- **In-canvas Phaser text vs the Vue HUD:** the Vue HUD overlays the TOP of the canvas; pin any Phaser help/
  debug text to the BOTTOM (`setOrigin(0,1)`, `y = height - 8`, `setScrollFactor(0)`) so they don't overlap.
- **Phaser + Vite HMR don't mix:** an HMR update to an engine module leaves a stale, half-updated `Phaser.Game`
  that looks frozen/unresponsive (input dead). `engine/game.ts` is a self-accepting HMR boundary that does a
  full `window.location.reload()` on any engine change. If a dev tab ever seems frozen after edits, hard-refresh.
- **Sprites pipeline (`engine/assets/sprites.ts`):** real art = CraftPix animated spritesheets under
  `public/assets/sprites/<entity>/<State>.png` (square frames; size = sheet height). `preloadSprites` runs in
  the scene's `preload()`, `createAnims` in `create()` (idempotent). Render via `Phaser.GameObjects.Sprite` +
  `applySprite(sprite, entity, state, body, facing)` which plays `<entity>-<state>`, scales, and foot-aligns
  (origin (0.5,1) at body bottom + `foot*scale`) or centers (`center: true`, flyers). Per-entity `scale`/`foot`
  are visual tunables. To add/replace art: drop PNGs in the entity folder and add a state entry — no render
  change. Keep the `CRAFTPIX-LICENSE-*.txt` files and README credit.
  - **Aligning `foot`:** the CraftPix frames have the feet at the very bottom (`botPad=0`), so `foot` is 0 for
    all grounded entities — a non-zero foot sinks them below the ground. Don't guess padding: measure the
    frame's transparent bottom padding (alpha bbox via a canvas) and set `foot` to that. Flyers use `center`.
- **`scene.load.*` needs `preload()`:** file-based assets (spritesheets, tile images) must be queued in the
  scene's `preload()`, not `create()`; anims are built in `create()` after the load completes.
- **No crouch sprite sheet:** the CraftPix knight pack ships idle/run/jump/attack/hurt/dead only — no Crouch.
  `knightAnim()` maps `crouch → idle`, so without help the knight freezes upright when ducking. `GameScene`
  squashes the sprite (Y ×0.62, X ×1.08) while `player.state === 'crouch'`; the foot-aligned origin (0.5,1)
  keeps the boots planted so the head drops. `setScale` after `applySprite` leaves its `setFlipX` intact, so
  keep the X factor positive (don't multiply by `facing`, or you double-flip). The FSM `crouch` state and its
  shrunk hitbox (`CROUCH_H`) are real gameplay; this is presentation-only. Drop a real `Crouch.png` + a
  `crouch` state entry in `sprites.ts` to replace the squash with art.
- **Control bindings live in `GameScene` (engine), not specs:** specs use abstract commands (`attack`,
  `jump`, `down`); the physical keys are an engine concern. Current scheme is NES-style — arrows/WASD move,
  `Z`/`Space` throw (`attack`), `X` swaps weapon. Remapping keys never touches `core/` or its specs.
- **Screen flow lives in the Vue store, not the engine:** `src/ui/stores/game.ts` holds a `Screen` union
  (`menu | levels | playing | paused | gameover | won`); `App.vue` renders the matching view. The engine only
  emits `game:over`/`game:won` (the store flips the screen) and reads `consumeStartLevel()` for the
  stage-select choice. Add a new screen by extending the union + a view, not by touching `GameScene`.
- **Audio is a procedural Web Audio adapter** (`engine/audio.ts`): no audio files ship; SFX/music are
  synthesized. `stepMatch` emits `{type:'sound', name}` effects (data) and the scene plays them via
  `playSfx`; the `AudioContext` is created lazily on the first gesture (browser autoplay policy — the START
  click). Mute is a master-gain ramp driven by the `ui:audio` bus command; the store owns the persisted
  on/off (`localStorage`).
- **Guard `localStorage` in the store:** `src/ui/stores/game.ts` is unit-tested in the **node** env where
  `localStorage` is undefined — wrap any access in `typeof localStorage !== 'undefined'` + try/catch (see
  the audio preference helpers), or the store tests throw at import/setup.
- (Add every new gotcha discovered here — living project.)
