import Phaser from 'phaser'
import type { LevelTheme } from '@core/level/level'

/**
 * Scenery art. Shared props (crate/ladder/chest) come from the CraftPix
 * "Cartoon Medieval Ruins" set. Each level then picks a **theme** that swaps the
 * ground tile and the full-screen background, so every stage looks distinct:
 * ruins, forest, cave, castle, ice and hell. Theme ground tiles are tiled with
 * `tileSprite`; backgrounds are single stretched layers.
 *
 * Theme ground/background PNGs live under `public/assets/tiles/<theme>/` and are
 * derived from free CraftPix packs (swap-tileset, dungeons-tileset,
 * medieval-tileset) — see the per-theme LICENSE.txt files.
 */

/** Shared props + the original ruins ground/backgrounds. */
export const TILE = {
  crate: 'tile-crate-img',
  ladder: 'tile-ladder-img',
  chest: 'tile-chest-img',
} as const

export const THEMES: readonly LevelTheme[] = ['ruins', 'forest', 'cave', 'castle', 'ice', 'hell']

/** Texture key for a theme's tiled ground/platform image. */
export const groundKey = (theme: LevelTheme): string => `ground-${theme}`
/** Texture key for a theme's full-screen background image. */
export const bgKey = (theme: LevelTheme): string => `bg-${theme}`

export function preloadTiles(scene: Phaser.Scene): void {
  scene.load.image(TILE.crate, 'assets/tiles/crate.png')
  scene.load.image(TILE.ladder, 'assets/tiles/ladder.png')
  scene.load.image(TILE.chest, 'assets/tiles/chest.png')

  // Ruins reuse the original shipped ground + the two original backdrops.
  scene.load.image(groundKey('ruins'), 'assets/tiles/ground.png')
  scene.load.image(bgKey('ruins'), 'assets/tiles/bg_graveyard.png')

  // Themed grounds + backgrounds (one folder per theme).
  for (const theme of THEMES) {
    if (theme === 'ruins') continue
    scene.load.image(groundKey(theme), `assets/tiles/${theme}/ground.png`)
    scene.load.image(bgKey(theme), `assets/tiles/${theme}/bg.png`)
  }
}
