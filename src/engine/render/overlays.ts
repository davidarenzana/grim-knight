import Phaser from 'phaser'
import { type ChestReward } from '@core/level/chest'
import { rewardIcon } from '@engine/assets/effects'
import {
  UI_FONT,
  COLOR,
  DEPTH,
  DURATION,
  BANNER,
  REWARD_ICON,
  FLOAT_LABEL,
} from '@engine/render/theme'

/**
 * Short-lived presentation overlays (chest-pickup juice and stage banners).
 * Each is a self-contained tween that creates its own GameObject and destroys it
 * on completion, so the scene only has to fire-and-forget. Pure presentation.
 */

/**
 * Pop a chest reward's icon out of the chest: it scales up with a little bounce,
 * then drifts up and fades. Weapons show their projectile art, the rest show a
 * dungeon item icon (heart/coin/gem/star).
 */
export function floatRewardIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  reward: ChestReward,
): void {
  const icon = rewardIcon(reward)
  const spr = scene.add
    .image(x, y, icon.key, icon.frame)
    .setOrigin(0.5, 0.5)
    .setDepth(DEPTH.rewardIcon)
    .setScale(REWARD_ICON.startScale)
  if (icon.tint !== undefined) spr.setTint(icon.tint)
  scene.tweens.add({
    targets: spr,
    scale: REWARD_ICON.popScale,
    y: y - REWARD_ICON.popRiseY,
    duration: DURATION.rewardIconPop,
    ease: 'Back.out',
    onComplete: () => {
      scene.tweens.add({
        targets: spr,
        y: y - REWARD_ICON.fadeRiseY,
        alpha: 0,
        duration: DURATION.rewardIconFade,
        ease: 'Cubic.in',
        onComplete: () => spr.destroy(),
      })
    },
  })
}

/** A short-lived label that floats up and fades (chest pickups). */
export function floatReward(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color: string,
): void {
  const t = scene.add
    .text(x, y - FLOAT_LABEL.startOffsetY, label, {
      fontFamily: UI_FONT,
      fontSize: FLOAT_LABEL.fontSize,
      color,
      stroke: COLOR.textStroke,
      strokeThickness: FLOAT_LABEL.strokeThickness,
    })
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.floatLabel)
  scene.tweens.add({
    targets: t,
    y: y - FLOAT_LABEL.riseY,
    scale: { from: FLOAT_LABEL.startScale, to: 1 },
    alpha: { from: 1, to: 0 },
    duration: DURATION.floatLabel,
    ease: 'Cubic.out',
    onComplete: () => t.destroy(),
  })
}

/** A centered banner (e.g. "STAGE CLEAR!") that pops in and holds. */
export function showBanner(scene: Phaser.Scene, text: string): void {
  const cam = scene.cameras.main
  const banner = scene.add
    .text(cam.width / 2, cam.height / 2, text, {
      fontFamily: UI_FONT,
      fontSize: BANNER.fontSize,
      color: COLOR.bannerText,
      stroke: COLOR.textStroke,
      strokeThickness: BANNER.strokeThickness,
      align: 'center',
      lineSpacing: BANNER.lineSpacing,
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(DEPTH.banner)
  scene.tweens.add({
    targets: banner,
    scale: { from: BANNER.startScale, to: 1 },
    duration: DURATION.banner,
    ease: 'Back.out',
  })
}
