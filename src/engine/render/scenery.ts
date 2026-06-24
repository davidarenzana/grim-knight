import Phaser from 'phaser'
import { type MatchConfig } from '@core/app'
import { type LevelDef } from '@core/level/level'
import { bgKey, groundKey, hazardKey, TILE } from '@engine/assets/tiles'
import {
  UI_FONT,
  COLOR,
  DEPTH,
  CRATE_MAX_W,
  LADDER_DRAW_PAD,
  LADDER_TILE_SIZE,
  HELP_TEXT,
} from '@engine/render/theme'

/**
 * Paints the one-shot static scenery for a stage: the backdrop, the geometry
 * (crates / ground / one-way ledges), the ladders, the contact hazards and the
 * fixed on-screen help text. Pure presentation — no game logic, no per-frame
 * work. Call it once in `create()` BEFORE building the dynamic {@link
 * WorldRenderer} pools, so the scenery sits behind the moving sprites (depths are
 * explicit where it matters, insertion order covers the rest).
 */
export function paintScenery(
  scene: Phaser.Scene,
  config: MatchConfig,
  level: LevelDef,
  view: number,
): void {
  // Static full-screen backdrop behind the world.
  scene.cameras.main.setBackgroundColor(COLOR.cameraBackground)
  scene.add
    .image(0, 0, bgKey(level.theme))
    .setOrigin(0, 0)
    .setDisplaySize(scene.scale.width, view)
    .setScrollFactor(0)
    .setDepth(DEPTH.backdrop)

  // Geometry: small solids = wooden crate; everything else (ground + one-way
  // ledges) = the grassy ground tile, so floating platforms are clearly drawn.
  for (const s of config.solids) {
    if (s.x + s.w <= 0 || s.x >= level.worldWidth) continue // skip boundary walls
    if (!s.oneWay && s.w < CRATE_MAX_W) {
      scene.add.image(s.x, s.y, TILE.crate).setOrigin(0, 0).setDisplaySize(s.w, s.h)
    } else {
      scene.add.tileSprite(s.x, s.y, s.w, s.h, groundKey(level.theme)).setOrigin(0, 0)
    }
  }

  for (const l of config.ladders) {
    // Drawn a touch wider than the thin hitbox so the rungs read. The square
    // ladder texture is *tiled* vertically (not stretched) so the rung spacing
    // stays constant whatever the ladder's height — one tile per draw-width of
    // height, which keeps each rung square.
    const drawW = l.w + LADDER_DRAW_PAD
    scene.add
      .tileSprite(l.x + l.w / 2, l.y, drawW, l.h, TILE.ladder)
      .setOrigin(0.5, 0)
      .setTileScale(drawW / LADDER_TILE_SIZE)
  }

  // Hazards (spikes/lava): painted with the theme's hazard tile; the damage
  // check itself lives in stepMatch.
  for (const h of config.hazards) {
    scene.add.tileSprite(h.x, h.y, h.w, h.h, hazardKey(level.theme)).setOrigin(0, 0)
  }

  // Fixed on-screen help, pinned to the bottom so it never overlaps the Vue
  // HUD (lives/score/time) which sits along the top of the canvas.
  scene.add
    .text(
      HELP_TEXT.x,
      view - HELP_TEXT.bottomMargin,
      `${level.name.toUpperCase()}   MOVE ←→  JUMP ↑  CROUCH ↓  THROW Z  SWAP X`,
      {
        fontFamily: UI_FONT,
        fontSize: HELP_TEXT.fontSize,
        color: COLOR.helpText,
        backgroundColor: COLOR.helpBackground,
        padding: HELP_TEXT.padding,
      },
    )
    .setScrollFactor(0)
    .setOrigin(0, 1)
    .setDepth(DEPTH.helpText)
}
