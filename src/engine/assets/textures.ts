import Phaser from 'phaser'

/**
 * Procedural art pass. We draw every sprite/tile with a Phaser Graphics and bake
 * it into a texture (`generateTexture`). No external asset files are needed, and
 * each texture key can later be replaced by a loaded PNG without touching render
 * code — GameScene only references `TEX.*` keys and entity body sizes.
 *
 * Textures are drawn at the entities' core body sizes so they render 1:1.
 */
export const TEX = {
  knight: 'knight',
  knightBare: 'knight-bare', // "underwear" state (armor lost)
  zombie: 'zombie',
  flyer: 'flyer',
  ogre: 'ogre',
  plant: 'plant',
  boss: 'boss',
  chest: 'chest',
  tileGround: 'tile-ground',
  tilePlatform: 'tile-platform',
  tileLadder: 'tile-ladder',
} as const

/** Generate and register every game texture. Call once at scene `create`. */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  const rect = (color: number, x: number, y: number, w: number, h: number, alpha = 1): void => {
    g.fillStyle(color, alpha)
    g.fillRect(x, y, w, h)
  }
  const make = (key: string, w: number, h: number, draw: () => void): void => {
    if (scene.textures.exists(key)) return
    g.clear()
    draw()
    g.generateTexture(key, w, h)
  }

  // --- Knight (24x48): plumed helmet, steel-blue armor, shield arm ---
  make(TEX.knight, 24, 48, () => {
    rect(0x2a2f45, 4, 40, 7, 8) // left boot
    rect(0x2a2f45, 13, 40, 7, 8) // right boot
    rect(0x3b5bdb, 5, 22, 14, 20) // armored torso
    rect(0x6f8bf0, 5, 22, 14, 4) // chest highlight
    rect(0x9aa0b5, 16, 26, 6, 12) // shield
    rect(0xe0ac69, 8, 12, 9, 10) // head/face
    rect(0x9aa0b5, 7, 8, 11, 6) // helmet
    rect(0xd64545, 11, 2, 4, 7) // red plume
  })

  // --- Knight bare (armor lost): pale body, no helmet ---
  make(TEX.knightBare, 24, 48, () => {
    rect(0x2a2f45, 4, 40, 7, 8)
    rect(0x2a2f45, 13, 40, 7, 8)
    rect(0xe8d2b0, 6, 22, 12, 18) // bare torso
    rect(0xffffff, 7, 34, 10, 5) // shorts
    rect(0xe0ac69, 8, 10, 9, 11) // head
    rect(0x6b3f1f, 7, 8, 11, 4) // hair
  })

  // --- Zombie (24x40): rotten green, sunken eyes ---
  make(TEX.zombie, 24, 40, () => {
    rect(0x4f6b1f, 5, 24, 14, 16) // legs/lower
    rect(0x6b8e23, 4, 8, 16, 18) // torso
    rect(0x86a83a, 4, 8, 16, 4) // shoulder highlight
    rect(0x3a4d16, 7, 14, 4, 4) // left eye socket
    rect(0x3a4d16, 13, 14, 4, 4) // right eye socket
    rect(0xd6e34a, 8, 15, 2, 2) // eye glint
    rect(0xd6e34a, 14, 15, 2, 2)
  })

  // --- Flyer (28x20): bat-demon with spread wings ---
  make(TEX.flyer, 28, 20, () => {
    rect(0x7a3fb0, 0, 4, 9, 8) // left wing
    rect(0x7a3fb0, 19, 4, 9, 8) // right wing
    rect(0x9b59b6, 9, 3, 10, 12) // body
    rect(0xc88be0, 9, 3, 10, 3) // top highlight
    rect(0xffe14a, 11, 7, 3, 3) // left eye
    rect(0xffe14a, 15, 7, 3, 3) // right eye
  })

  // --- Ogre (40x56): bulky brute with fists ---
  make(TEX.ogre, 40, 56, () => {
    rect(0x5e1212, 8, 42, 10, 14) // left leg
    rect(0x5e1212, 22, 42, 10, 14) // right leg
    rect(0x8b1a1a, 4, 12, 32, 32) // torso
    rect(0xa83232, 4, 12, 32, 6) // shoulder highlight
    rect(0x8b1a1a, 0, 20, 8, 14) // left fist
    rect(0x8b1a1a, 32, 20, 8, 14) // right fist
    rect(0x3a0a0a, 12, 22, 7, 6) // left eye
    rect(0x3a0a0a, 23, 22, 7, 6) // right eye
    rect(0xffd23a, 14, 24, 3, 3)
    rect(0xffd23a, 25, 24, 3, 3)
  })

  // --- Plant (28x32): stalk with a toothy maw ---
  make(TEX.plant, 28, 32, () => {
    rect(0x1f5a32, 11, 14, 6, 18) // stalk
    rect(0x2e8b57, 4, 18, 20, 6) // leaves
    rect(0x8b1a3a, 6, 2, 16, 14) // maw (open mouth)
    rect(0x2e8b57, 6, 2, 16, 4) // upper lip
    rect(0xffffff, 8, 6, 3, 4) // fang
    rect(0xffffff, 17, 6, 3, 4) // fang
  })

  // --- Boss (64x80): towering cyclops sentinel, single eye ---
  make(TEX.boss, 64, 80, () => {
    rect(0x3a0a5a, 10, 60, 18, 20) // left leg
    rect(0x3a0a5a, 36, 60, 18, 20) // right leg
    rect(0x6a0dad, 6, 14, 52, 50) // torso
    rect(0x8a2dd0, 6, 14, 52, 8) // shoulder highlight
    rect(0x6a0dad, 0, 26, 8, 26) // left arm
    rect(0x6a0dad, 56, 26, 8, 26) // right arm
    rect(0x2a0640, 22, 28, 20, 18) // eye socket
    rect(0xffe14a, 26, 32, 12, 10) // big eye
    rect(0x101010, 29, 35, 6, 5) // pupil
    rect(0xb0b0c0, 14, 6, 10, 10) // left horn
    rect(0xb0b0c0, 40, 6, 10, 10) // right horn
  })

  // --- Chest (24x20): banded wooden chest with a gold lock ---
  make(TEX.chest, 24, 20, () => {
    rect(0x6b3f17, 1, 6, 22, 14) // body
    rect(0x4a2a0f, 1, 6, 22, 2) // lid seam shadow
    rect(0x8a5a22, 1, 0, 22, 7) // lid
    rect(0xc28b3a, 0, 0, 24, 2) // lid top trim
    rect(0xffd23a, 9, 5, 6, 7) // gold lock
    rect(0x9a6a12, 11, 8, 2, 3) // keyhole
  })

  // --- Ground tile (32x40): earth with a grass cap and speckles ---
  make(TEX.tileGround, 32, 40, () => {
    rect(0x4a3520, 0, 0, 32, 40) // earth
    rect(0x6b8f5a, 0, 0, 32, 6) // grass cap
    rect(0x7da866, 0, 0, 32, 2) // grass highlight
    rect(0x3a2917, 5, 14, 4, 4) // speckle
    rect(0x3a2917, 20, 24, 5, 4) // speckle
    rect(0x5a4128, 12, 30, 4, 4) // speckle
  })

  // --- One-way platform tile (32x20): wooden plank ---
  make(TEX.tilePlatform, 32, 20, () => {
    rect(0x6b4a26, 0, 0, 32, 20) // plank
    rect(0x8a6234, 0, 0, 32, 4) // top highlight
    rect(0x4a3017, 0, 18, 32, 2) // bottom shadow
    rect(0x4a3017, 15, 0, 2, 20) // plank seam
  })

  // --- Ladder tile (16x16): two rails and a rung ---
  make(TEX.tileLadder, 16, 16, () => {
    rect(0x8a6d3b, 1, 0, 4, 16) // left rail
    rect(0x8a6d3b, 11, 0, 4, 16) // right rail
    rect(0xb08a4e, 1, 6, 14, 4) // rung
  })

  g.destroy()
}
