import Phaser from 'phaser'

/**
 * Enemy projectile art. Each enemy tags its shots with a `sprite` id (set in
 * pure core, presentation-only): the boss lobs an animated fireball, the turtle
 * a bullet, the plant a green spore, the bloated a purple bolt. Two shapes:
 *  - `frames`: per-frame PNGs under `assets/sprites/enemy/<dir>/1..N.png`, looped.
 *  - `image`: one static PNG `assets/sprites/enemy/<file>.png` (optionally tinted;
 *    spore/bolt reuse the same bolt art with different tints).
 * The scene falls back to a colored rectangle when a tag has no art.
 *
 * Art: CraftPix.net free packs — see public/assets/sprites/enemy/CRAFTPIX-LICENSE-*.txt
 * (fireball) and public/assets/effects/CRAFTPIX-LICENSE-*.txt.
 */
type EnemyProjectileDef =
  | { readonly kind: 'frames'; readonly dir: string; readonly count: number; readonly fps: number }
  | { readonly kind: 'image'; readonly file: string; readonly tint?: number }

export const ENEMY_PROJECTILES: Readonly<Record<string, EnemyProjectileDef>> = {
  fire: { kind: 'frames', dir: 'fire', count: 6, fps: 14 },
  bullet: { kind: 'image', file: 'bullet' },
  bolt: { kind: 'image', file: 'bolt', tint: 0xb866ff },
  spore: { kind: 'image', file: 'bolt', tint: 0x7fe05a },
}

const eprojAnimKey = (id: string): string => `eproj-${id}`
const eprojFrameKey = (dir: string, i: number): string => `eproj-${dir}-${i}`
const eprojImageKey = (file: string): string => `eproj-img-${file}`

/** Queue every enemy-projectile texture. Call from the scene's `preload()`. */
export function preloadEnemyProjectiles(scene: Phaser.Scene): void {
  const loaded = new Set<string>()
  for (const def of Object.values(ENEMY_PROJECTILES)) {
    if (def.kind === 'frames') {
      for (let i = 1; i <= def.count; i++) {
        scene.load.image(eprojFrameKey(def.dir, i), `assets/sprites/enemy/${def.dir}/${i}.png`)
      }
    } else if (!loaded.has(def.file)) {
      loaded.add(def.file)
      scene.load.image(eprojImageKey(def.file), `assets/sprites/enemy/${def.file}.png`)
    }
  }
}

/** Build one looping animation per animated enemy projectile. Idempotent. */
export function createEnemyProjectileAnims(scene: Phaser.Scene): void {
  for (const [id, def] of Object.entries(ENEMY_PROJECTILES)) {
    if (def.kind !== 'frames') continue
    const key = eprojAnimKey(id)
    if (scene.anims.exists(key)) continue
    scene.anims.create({
      key,
      frames: Array.from({ length: def.count }, (_, i) => ({ key: eprojFrameKey(def.dir, i + 1) })),
      frameRate: def.fps,
      repeat: -1,
    })
  }
}

export interface EnemyProjectileVisual {
  /** Texture to seed the sprite. */
  readonly texture: string
  /** Looping animation key, if the projectile is animated. */
  readonly anim?: string
  /** Optional tint applied to the sprite. */
  readonly tint?: number
}

/** Render info for an enemy projectile `sprite` tag, or undefined to fall back. */
export function enemyProjectileVisual(id: string): EnemyProjectileVisual | undefined {
  const def = ENEMY_PROJECTILES[id]
  if (!def) return undefined
  if (def.kind === 'frames') {
    return { texture: eprojFrameKey(def.dir, 1), anim: eprojAnimKey(id) }
  }
  return { texture: eprojImageKey(def.file), ...(def.tint !== undefined ? { tint: def.tint } : {}) }
}
