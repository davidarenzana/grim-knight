import Phaser from 'phaser'

/**
 * Scenery art (CraftPix "Cartoon Medieval Ruins" level set). Loaded as plain
 * images: grounds/platforms are tiled with `tileSprite`, the crate/chest/ladder
 * are single stretched images, and the backgrounds are static full-screen layers.
 * License: public/assets/tiles/CRAFTPIX-LICENSE-tileset.txt.
 */
export const TILE = {
  ground: 'tile-ground-img',
  platform: 'tile-platform-img',
  crate: 'tile-crate-img',
  ladder: 'tile-ladder-img',
  chest: 'tile-chest-img',
  bgGraveyard: 'bg-graveyard',
  bgCave: 'bg-cave',
} as const

export function preloadTiles(scene: Phaser.Scene): void {
  scene.load.image(TILE.ground, 'assets/tiles/ground.png')
  scene.load.image(TILE.platform, 'assets/tiles/platform.png')
  scene.load.image(TILE.crate, 'assets/tiles/crate.png')
  scene.load.image(TILE.ladder, 'assets/tiles/ladder.png')
  scene.load.image(TILE.chest, 'assets/tiles/chest.png')
  scene.load.image(TILE.bgGraveyard, 'assets/tiles/bg_graveyard.png')
  scene.load.image(TILE.bgCave, 'assets/tiles/bg_cave.png')
}

/** Background key per level index (cavern/fortress/keep get the cave layer). */
export const backgroundFor = (levelIndex: number): string =>
  new Set([2, 3, 5]).has(levelIndex) ? TILE.bgCave : TILE.bgGraveyard
