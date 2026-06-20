import Phaser from 'phaser'

/**
 * Animated sprite pipeline (CraftPix art). Each entity folder under
 * `public/assets/sprites/<entity>/` holds one PNG sheet per state; every sheet
 * is square horizontal frames (frame size = sheet height). We load each sheet as
 * its own texture keyed `<entity>-<state>` and build one animation per sheet.
 *
 * `scale`/`foot` are presentation tunables: the drawn character occupies only
 * part of its padded frame, so we scale the frame down and push it `foot` source
 * px so the feet sit on the body's bottom edge. `center` entities (flyers) are
 * centered on the body instead of foot-aligned.
 *
 * Art: CraftPix.net free packs — see public/assets/sprites/CRAFTPIX-LICENSE-*.txt.
 */
interface StateDef {
  readonly file: string
  readonly fps: number
  readonly loop: boolean
}
interface SpriteDef {
  readonly frame: number
  readonly scale: number
  readonly foot: number
  readonly center?: boolean
  readonly states: Readonly<Record<string, StateDef>>
}

export const SPRITES: Readonly<Record<string, SpriteDef>> = {
  // Unarmored hero (after losing armor): Warrior_3 (spear, cloth tunic).
  knight: {
    frame: 96,
    scale: 0.92,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      run: { file: 'Run', fps: 12, loop: true },
      jump: { file: 'Jump', fps: 10, loop: false },
      attack: { file: 'Attack', fps: 16, loop: false },
      hurt: { file: 'Hurt', fps: 10, loop: false },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  // Armored hero (full plate + shield): Warrior_2. Shown while `armored`.
  knight_armored: {
    frame: 96,
    scale: 0.92,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      run: { file: 'Run', fps: 12, loop: true },
      jump: { file: 'Jump', fps: 10, loop: false },
      attack: { file: 'Attack', fps: 16, loop: false },
      hurt: { file: 'Hurt', fps: 10, loop: false },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  zombie: {
    frame: 128,
    scale: 0.6,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 10, loop: true },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  plant: {
    frame: 128,
    scale: 0.55,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      attack: { file: 'Attack', fps: 12, loop: false },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  flyer: {
    frame: 128,
    scale: 0.42,
    foot: 0,
    center: true,
    states: {
      idle: { file: 'Idle', fps: 10, loop: true },
      dead: { file: 'Dead', fps: 10, loop: false },
    },
  },
  ogre: {
    frame: 96,
    scale: 1.0,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 9, loop: true },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  // Three boss skins (96px, bosses/1–3), one per pair of stages. Selected at
  // spawn time as `boss<variant>` from the enemy's `variant`.
  boss1: {
    frame: 96,
    scale: 1.6,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 9, loop: true },
      attack: { file: 'Attack', fps: 12, loop: false },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  boss2: {
    frame: 96,
    scale: 1.9,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 9, loop: true },
      attack: { file: 'Attack', fps: 12, loop: false },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  boss3: {
    frame: 96,
    scale: 2.4,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 9, loop: true },
      attack: { file: 'Attack', fps: 12, loop: false },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  // New swap-monster pack (72px frames): low fast crawler, ranged turtle,
  // stationary bolt-lobber. Foot-aligned like the other walkers.
  centipede: {
    frame: 72,
    scale: 0.7,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 12, loop: true },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  turtle: {
    frame: 72,
    scale: 0.8,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 9, loop: true },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  bloated: {
    frame: 72,
    scale: 0.9,
    foot: 0,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
}

const animKey = (entity: string, state: string): string => `${entity}-${state}`

/** Queue every sprite sheet for loading. Call from the scene's `preload()`. */
export function preloadSprites(scene: Phaser.Scene): void {
  for (const [entity, def] of Object.entries(SPRITES)) {
    for (const [state, s] of Object.entries(def.states)) {
      scene.load.spritesheet(animKey(entity, state), `assets/sprites/${entity}/${s.file}.png`, {
        frameWidth: def.frame,
        frameHeight: def.frame,
      })
    }
  }
}

/** Build one animation per loaded sheet. Idempotent (safe across scene restarts). */
export function createAnims(scene: Phaser.Scene): void {
  for (const [entity, def] of Object.entries(SPRITES)) {
    for (const [state, s] of Object.entries(def.states)) {
      const key = animKey(entity, state)
      if (scene.anims.exists(key)) continue
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, {}),
        frameRate: s.fps,
        repeat: s.loop ? -1 : 0,
      })
    }
  }
}

/** Does this entity have an animation for the given state? */
export const hasAnim = (entity: string, state: string): boolean =>
  state in (SPRITES[entity]?.states ?? {})

export { animKey }

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
