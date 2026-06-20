import Phaser from 'phaser'
import type { ChestReward } from '@core/level/chest'
import { weaponAnimKey } from './sprites'

/**
 * One-shot visual effects (CraftPix "Pixel Art Explosion" + "Magic" packs) and
 * the reward icons shown when a chest is opened.
 *
 * Two effect shapes:
 *  - `frames`: a sequence of individual PNGs (`assets/effects/<name>/1..N.png`),
 *    loaded as separate textures and stitched into one animation. Used for the
 *    256px explosion, which ships as one file per frame.
 *  - `sheet`: a single horizontal spritesheet (square frames), loaded and sliced
 *    like the character sprites. Used for the 72px magic ring burst.
 *
 * `playEffect()` spawns a transient sprite that plays once and self-destroys —
 * no pooling needed (effects are short and infrequent: enemy deaths, chests).
 *
 * Art: CraftPix.net free packs — see public/assets/effects/CRAFTPIX-LICENSE-*.txt.
 */
type EffectDef =
  | { readonly kind: 'frames'; readonly count: number; readonly fps: number }
  | { readonly kind: 'sheet'; readonly frame: number; readonly fps: number }

export const EFFECTS: Readonly<Record<string, EffectDef>> = {
  // Golden fiery burst (10 × 256px frames). Played on enemy/boss death.
  explosion: { kind: 'frames', count: 10, fps: 24 },
  // Expanding purple magic ring (8 × 72px frames). Played when a chest opens.
  magic_ring: { kind: 'sheet', frame: 72, fps: 18 },
  // Quick golden spark burst (10 × 256px frames). Played on a non-fatal hit.
  spark: { kind: 'frames', count: 10, fps: 36 },
}

const effectAnimKey = (name: string): string => `fx-${name}`
const effectFrameKey = (name: string, i: number): string => `fx-${name}-${i}`

/** Queue every effect's textures. Call from the scene's `preload()`. */
export function preloadEffects(scene: Phaser.Scene): void {
  for (const [name, def] of Object.entries(EFFECTS)) {
    if (def.kind === 'frames') {
      for (let i = 1; i <= def.count; i++) {
        scene.load.image(effectFrameKey(name, i), `assets/effects/${name}/${i}.png`)
      }
    } else {
      scene.load.spritesheet(effectAnimKey(name), `assets/effects/${name}.png`, {
        frameWidth: def.frame,
        frameHeight: def.frame,
      })
    }
  }
}

/** Build one non-looping animation per effect. Idempotent across restarts. */
export function createEffectAnims(scene: Phaser.Scene): void {
  for (const [name, def] of Object.entries(EFFECTS)) {
    const key = effectAnimKey(name)
    if (scene.anims.exists(key)) continue
    const frames =
      def.kind === 'frames'
        ? Array.from({ length: def.count }, (_, i) => ({ key: effectFrameKey(name, i + 1) }))
        : scene.anims.generateFrameNumbers(key, {})
    scene.anims.create({ key, frames, frameRate: def.fps, repeat: 0 })
  }
}

/** First texture key of an effect, used to seed the transient sprite. */
const effectTexture = (name: string): string => {
  const def = EFFECTS[name]!
  return def.kind === 'frames' ? effectFrameKey(name, 1) : effectAnimKey(name)
}

/**
 * Spawn a one-shot effect at world (x, y), centered. Returns the sprite (already
 * playing); it destroys itself when the animation completes.
 */
export function playEffect(
  scene: Phaser.Scene,
  name: string,
  x: number,
  y: number,
  scale = 1,
): Phaser.GameObjects.Sprite {
  const spr = scene.add
    .sprite(x, y, effectTexture(name))
    .setOrigin(0.5, 0.5)
    .setScale(scale)
    .setDepth(1400)
  spr.play(effectAnimKey(name))
  spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.destroy())
  return spr
}

/** Reward icon texture keys (CraftPix dungeon item set, 32px). */
export const ICON = {
  heart: 'icon-heart',
  coin: 'icon-coin',
  crystal: 'icon-crystal',
  star: 'icon-star',
} as const

/** Queue the reward icon images. Call from the scene's `preload()`. */
export function preloadIcons(scene: Phaser.Scene): void {
  scene.load.image(ICON.heart, 'assets/icons/heart.png')
  scene.load.image(ICON.coin, 'assets/icons/coin.png')
  scene.load.image(ICON.crystal, 'assets/icons/crystal.png')
  scene.load.image(ICON.star, 'assets/icons/star.png')
}

export interface RewardIcon {
  readonly key: string
  readonly frame?: number
  readonly tint?: number
}

/**
 * Pick the icon that represents a chest reward: a heart for a 1UP, a coin for
 * points, a gem for armor, the weapon's own projectile art for a weapon, and a
 * purple-tinted star for the magician's curse.
 */
export function rewardIcon(reward: ChestReward): RewardIcon {
  switch (reward.kind) {
    case 'life':
      return { key: ICON.heart }
    case 'points':
      return { key: ICON.coin }
    case 'armor':
      return { key: ICON.crystal }
    case 'curse':
      return { key: ICON.star, tint: 0x9b4dff }
    case 'weapon':
      return { key: weaponAnimKey(reward.weaponId), frame: 0 }
  }
}
