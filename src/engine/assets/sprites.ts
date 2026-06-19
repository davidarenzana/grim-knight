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
  knight: {
    frame: 96,
    scale: 0.92,
    foot: 18,
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
    scale: 0.5,
    foot: 24,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 10, loop: true },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  plant: {
    frame: 128,
    scale: 0.42,
    foot: 18,
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
    scale: 1.05,
    foot: 16,
    states: {
      idle: { file: 'Idle', fps: 8, loop: true },
      walk: { file: 'Walk', fps: 9, loop: true },
      dead: { file: 'Dead', fps: 8, loop: false },
    },
  },
  boss: {
    frame: 96,
    scale: 1.6,
    foot: 16,
    states: {
      walk: { file: 'Walk', fps: 8, loop: true },
      attack: { file: 'Attack', fps: 10, loop: false },
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
