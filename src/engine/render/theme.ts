/**
 * Engine presentation constants. Every pixel offset, depth, tween duration,
 * font and color the Phaser adapter uses lives here as a named token, so the
 * scene/renderer read semantically and the look is tuned in one place. These are
 * pure presentation (adapter-side) — gameplay tunables live in `@core/app/tuning`.
 */

/** Pixel UI font shared with the Vue HUD. Latin subset only — no arrow glyphs. */
export const UI_FONT = '"Press Start 2P", monospace'

/** Render layer ordering (Phaser depth). */
export const DEPTH = {
  backdrop: -1000,
  drop: 60,
  helpText: 1000,
  rewardIcon: 1450,
  floatLabel: 1500,
  banner: 2000,
} as const

/** Tween durations (ms). */
export const DURATION = {
  rewardIconPop: 600,
  rewardIconFade: 650,
  floatLabel: 1300,
  banner: 320,
} as const

/** Presentation colors (hex strings for text, 0x numbers for fills/tints). */
export const COLOR = {
  cameraBackground: 0x12141f,
  helpText: '#f4ead2',
  helpBackground: '#000000aa',
  textStroke: '#000000',
  bannerText: '#ffd23a',
  projectileFallback: 0xffcc00,
  enemyProjectileFallback: 0xff4444,
  hitFlash: 0xffffff,
} as const

/** Greybox color per weapon id for the projectile rect fallback (no art). */
export const WEAPON_COLOR: Record<string, number> = {
  lance: 0xffcc00,
  dagger: 0xc0c0c0,
  torch: 0xff7a1a,
  axe: 0x66ccff,
}

/** Seconds an enemy flashes white after taking a hit (render-only juice). */
export const HIT_FLASH = 0.1
/** Banner hold (ms) before advancing to the next stage. */
export const STAGE_CLEAR_MS = 1700

/** Camera follow lerp factor (x/y), and one-time backdrop setup. */
export const CAMERA_FOLLOW_LERP = 0.12

/** Solids narrower than this (and not one-way) are drawn as a crate, not ground. */
export const CRATE_MAX_W = 200
/** Ladders are drawn this many px wider than their thin hitbox so rungs read. */
export const LADDER_DRAW_PAD = 12
/** Native (square) size of the ladder texture; used to tile it without stretch. */
export const LADDER_TILE_SIZE = 128

/** On-screen help text layout. */
export const HELP_TEXT = {
  x: 10,
  bottomMargin: 8,
  fontSize: '10px',
  padding: { x: 7, y: 5 },
} as const

/** Knight crouch squash (no crouch sheet ships) and i-frame blink. */
export const KNIGHT = {
  crouchScaleX: 1.08,
  crouchScaleY: 0.62,
  blinkPeriodMs: 80,
  blinkAlpha: 0.35,
} as const

/** Projectile rendering. */
export const PROJECTILE = {
  spriteScale: 0.7,
  /** Animated enemy shot display size = max(w,h) × this. */
  enemyAnimSizeMul: 2.4,
  /** Static enemy shot display size = w/h × this. */
  enemyStaticSizeMul: 1.3,
} as const

/** Floating reward icon tween (pops out of the chest, then drifts up + fades). */
export const REWARD_ICON = {
  iconOffsetY: 24,
  startScale: 0.4,
  popScale: 0.95,
  popRiseY: 22,
  fadeRiseY: 44,
} as const

/** Floating reward label tween. */
export const FLOAT_LABEL = {
  fontSize: '12px',
  strokeThickness: 5,
  startOffsetY: 6,
  riseY: 52,
  startScale: 0.7,
} as const

/** Centered stage banner ("STAGE CLEAR!", "VICTORY!"). */
export const BANNER = {
  fontSize: '24px',
  strokeThickness: 6,
  lineSpacing: 8,
  startScale: 0.5,
} as const

/** Enemy death-burst juice (bigger/louder for a boss). */
export const DEATH_BURST = {
  bossExplosionScale: 0.7,
  enemyExplosionScale: 0.32,
  bossShake: { ms: 260, intensity: 0.012 },
  enemyShake: { ms: 80, intensity: 0.004 },
} as const

/** Chest sprite is drawn slightly larger than its hitbox. */
export const CHEST_DRAW_PAD = { w: 10, h: 12 } as const

/** Drop sprite: bob animation + draw padding over the hitbox. */
export const DROP = {
  drawPad: 6,
  bobAmplitude: 3,
  bobPeriodMs: 220,
} as const

/** Golden-ratio hash multipliers mixing stage/loop into the loot RNG seed. */
export const SEED_MIX = { level: 0x9e3779b1, loop: 0x85ebca6b } as const
