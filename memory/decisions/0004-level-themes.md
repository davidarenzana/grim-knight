# ADR 0004 — Per-level visual themes

- **Status:** accepted
- **Date:** 2026-06-19

## Context

All six stages shared one ground tile and only two backdrops, so they looked
nearly identical. We wanted each stage visually distinct using the imported
CraftPix packs (swap/dungeons/medieval), without leaking art concerns into the
pure core.

## Decision

`LevelTheme = 'ruins' | 'forest' | 'cave' | 'castle' | 'ice' | 'hell'` lives in
`core/level/level.ts` (pure string union — data, not art) and each `LevelDef`
carries a `theme`. The engine owns the art: `engine/assets/tiles.ts` maps a
theme to a ground texture key (`groundKey`) and a backdrop key (`bgKey`), loads
one `ground.png` + `bg.png` per theme from `public/assets/tiles/<theme>/`, and
`GameScene` paints the active level's theme instead of a single shared ground.

Theme art was prepared offline (PIL): ground tiles composed from pack tiles
(ice/hell tinted; castle/ice backdrops are built gradients since those packs
ship no full-screen background). Shared props (crate/ladder/chest) stay global.

## Consequences

- (+) Every stage reads as a different place; adding a theme = drop two PNGs and
  add a key.
- (+) Core stays pure: the theme is just data; the core never imports the engine.
- (−) Themes vary ground + backdrop only (not crate/ladder yet) — enough to
  differentiate; per-theme props can come later.
