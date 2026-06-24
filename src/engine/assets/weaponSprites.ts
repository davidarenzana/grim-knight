import Phaser from 'phaser'

/**
 * Thrown-weapon projectile art (32px frame sheets, 4 frames each). Each weapon
 * id maps to one looping animation: the lance barely shimmers, the dagger
 * flips, the torch flickers, the axe spins. Rendered centered on the projectile
 * and flipped by travel direction.
 */
const WEAPON_FPS: Readonly<Record<string, number>> = {
  lance: 8,
  dagger: 18,
  torch: 12,
  axe: 16,
}
const WEAPON_FRAME = 32

export const WEAPON_SPRITE_IDS = Object.keys(WEAPON_FPS)
export const weaponAnimKey = (id: string): string => `weapon-${id}`

export function preloadWeapons(scene: Phaser.Scene): void {
  for (const id of WEAPON_SPRITE_IDS) {
    scene.load.spritesheet(weaponAnimKey(id), `assets/sprites/weapons/${id}.png`, {
      frameWidth: WEAPON_FRAME,
      frameHeight: WEAPON_FRAME,
    })
  }
}

export function createWeaponAnims(scene: Phaser.Scene): void {
  for (const id of WEAPON_SPRITE_IDS) {
    const key = weaponAnimKey(id)
    if (scene.anims.exists(key)) continue
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(key, {}),
      frameRate: WEAPON_FPS[id] ?? 12,
      repeat: -1,
    })
  }
}

/** Whether this weapon id has projectile art loaded (else the engine falls back). */
export const hasWeaponSprite = (scene: Phaser.Scene, id: string): boolean =>
  scene.textures.exists(weaponAnimKey(id))
