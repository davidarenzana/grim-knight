import Phaser from 'phaser'
import { lerp } from '@core/math/vector'
import { type Player, PLAYER_W, PLAYER_H } from '@core/fsm/player'
import { LANCE } from '@core/weapons/weapon'
import { type MatchState } from '@core/app'
import { type LevelTheme } from '@core/level/level'
import {
  SPRITES,
  weaponAnimKey,
  hasWeaponSprite,
  enemyProjectileVisual,
} from '@engine/assets/sprites'
import { TILE, groundKey } from '@engine/assets/tiles'
import { ICON, rewardIcon, playEffect } from '@engine/assets/effects'
import { applySprite, enemyAnim, knightAnim } from './sprites'
import {
  COLOR,
  DEPTH,
  DEATH_BURST,
  DROP,
  CHEST_DRAW_PAD,
  HIT_FLASH,
  KNIGHT,
  PROJECTILE,
  WEAPON_COLOR,
} from './theme'

/**
 * Owns every dynamic sprite pool (knight, projectiles, enemies, chests, drops,
 * moving platforms) and the render-only juice trackers (per-enemy hit-flash,
 * last-seen HP, one-shot death-burst guard). Given a fresh `MatchState` each
 * frame it syncs the Phaser GameObjects to the simulation — no gameplay logic.
 * The scene delegates all per-entity drawing here so it stays a thin orchestrator.
 */
export class WorldRenderer {
  knight!: Phaser.GameObjects.Sprite

  private projSprites: Phaser.GameObjects.Sprite[] = []
  private projRects: Phaser.GameObjects.Rectangle[] = [] // fallback when a weapon has no art
  private enemyProjRects: Phaser.GameObjects.Rectangle[] = []
  private enemyProjSprites: Phaser.GameObjects.Sprite[] = []
  private enemySprites: Phaser.GameObjects.Sprite[] = []
  private chestSprites: Phaser.GameObjects.Image[] = []
  private dropSprites: Phaser.GameObjects.Image[] = []
  private platformSprites: Phaser.GameObjects.TileSprite[] = []

  // Render-derived juice (NOT gameplay): per-enemy white hit-flash timer, the
  // last HP seen (to detect a fresh hit), and a one-shot death-burst guard.
  private enemyFlash: number[] = []
  private enemyHp: number[] = []
  private enemyExploded: boolean[] = []

  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * (Re)build the pools for a fresh stage. `scene.restart()` destroys every
   * GameObject, so we start from empty pools and recreate the knight + moving
   * platform sprites against the new state.
   */
  reset(state: MatchState, theme: LevelTheme): void {
    this.projSprites = []
    this.projRects = []
    this.enemyProjRects = []
    this.enemyProjSprites = []
    this.enemySprites = []
    this.chestSprites = []
    this.dropSprites = []
    this.platformSprites = []
    this.enemyFlash = []
    this.enemyHp = []
    this.enemyExploded = []

    // Moving platforms: one tiled sprite each, repositioned every frame. Drawn
    // with the theme's ground tile (like the shelves).
    for (const p of state.platforms) {
      this.platformSprites.push(
        this.scene.add.tileSprite(p.pos.x, p.pos.y, p.w, p.h, groundKey(theme)).setOrigin(0, 0),
      )
    }

    this.knight = this.scene.add.sprite(
      state.player.body.pos.x,
      state.player.body.pos.y,
      'knight-idle',
    )
  }

  /** Sync every pool to the current simulation state for this frame. */
  render(state: MatchState, prev: Player, alpha: number, time: number, delta: number): void {
    // Decay the render-only hit-flash by real time.
    this.enemyFlash = this.enemyFlash.map((t) => Math.max(0, t - delta / 1000))
    this.renderKnight(state.player, prev, alpha, time)
    this.renderPlatforms(state)
    this.renderProjectiles(state)
    this.renderEnemyProjectiles(state)
    this.renderEnemies(state)
    this.renderChests(state)
    this.renderDrops(state)
  }

  private renderKnight(player: Player, prev: Player, alpha: number, time: number): void {
    const pos = lerp(prev.body.pos, player.body.pos, alpha)
    // Armor state picks the skin: armored = plate, otherwise the unarmored skin.
    const skin = player.armor.state === 'armored' ? 'knight_armored' : 'knight'
    applySprite(
      this.knight,
      skin,
      knightAnim(player.state),
      { pos, w: PLAYER_W, h: PLAYER_H },
      player.facing,
    )
    // The knight pack has no crouch sheet, so ducking would freeze on idle.
    // Squash the pose vertically (and widen slightly) so the crouch reads: the
    // foot-aligned origin keeps the boots planted while the head drops.
    if (player.state === 'crouch') {
      // setScale leaves the flipX set by applySprite intact, so keep X positive.
      const s = SPRITES[skin]!.scale
      this.knight.setScale(s * KNIGHT.crouchScaleX, s * KNIGHT.crouchScaleY)
    }
    // Blink while invulnerable (i-frames) after a hit.
    const blinking = player.armor.iFramesLeft > 0
    this.knight.setAlpha(
      blinking && Math.floor(time / KNIGHT.blinkPeriodMs) % 2 === 0 ? KNIGHT.blinkAlpha : 1,
    )
  }

  /** Reposition each moving-platform sprite to its current simulation position. */
  private renderPlatforms(state: MatchState): void {
    state.platforms.forEach((p, i) => {
      this.platformSprites[i]?.setPosition(p.pos.x, p.pos.y)
    })
  }

  /**
   * Sync the player projectile pool. Uses the active weapon's animated sprite
   * centered on each projectile and flipped by travel direction; falls back to a
   * colored rectangle if a weapon has no art.
   */
  private renderProjectiles(state: MatchState): void {
    const projectiles = state.weapon.projectiles
    const id = state.activeWeapon.id

    if (hasWeaponSprite(this.scene, id)) {
      const key = weaponAnimKey(id)
      while (this.projSprites.length < projectiles.length) {
        this.projSprites.push(
          this.scene.add.sprite(0, 0, key).setOrigin(0.5, 0.5).setScale(PROJECTILE.spriteScale),
        )
      }
      this.projSprites.forEach((spr, i) => {
        const p = projectiles[i]
        if (p) {
          spr.setVisible(true)
          spr.play(key, true)
          spr.setPosition(p.pos.x + p.w / 2, p.pos.y + p.h / 2)
          spr.setFlipX(p.vel.x < 0)
        } else {
          spr.setVisible(false)
        }
      })
      this.projRects.forEach((r) => r.setVisible(false))
      return
    }

    // Fallback: colored rectangles (a weapon without art).
    const color = WEAPON_COLOR[id] ?? COLOR.projectileFallback
    while (this.projRects.length < projectiles.length) {
      this.projRects.push(
        this.scene.add.rectangle(0, 0, LANCE.w, LANCE.h, COLOR.projectileFallback).setOrigin(0, 0),
      )
    }
    this.projRects.forEach((rect, i) => {
      const p = projectiles[i]
      if (p)
        rect.setVisible(true).setPosition(p.pos.x, p.pos.y).setSize(p.w, p.h).setFillStyle(color)
      else rect.setVisible(false)
    })
    this.projSprites.forEach((s) => s.setVisible(false))
  }

  /**
   * Sync the enemy-projectile pools. A shot with a known `sprite` tag draws an
   * animated/tinted sprite; anything else falls back to the red rectangle. Each
   * pool index shows at most one of the two.
   */
  private renderEnemyProjectiles(state: MatchState): void {
    const ps = state.enemyProjectiles
    while (this.enemyProjRects.length < ps.length) {
      this.enemyProjRects.push(
        this.scene.add.rectangle(0, 0, 1, 1, COLOR.enemyProjectileFallback).setOrigin(0.5, 0.5),
      )
    }
    while (this.enemyProjSprites.length < ps.length) {
      this.enemyProjSprites.push(this.scene.add.sprite(0, 0, 'eproj-img-bolt').setOrigin(0.5, 0.5))
    }
    const n = Math.max(this.enemyProjRects.length, this.enemyProjSprites.length)
    for (let i = 0; i < n; i++) {
      const p = ps[i]
      const rect = this.enemyProjRects[i]
      const spr = this.enemyProjSprites[i]
      const visual = p?.sprite ? enemyProjectileVisual(p.sprite) : undefined
      if (p && visual && spr) {
        const cx = p.pos.x + p.w / 2
        const cy = p.pos.y + p.h / 2
        spr
          .setVisible(true)
          .setPosition(cx, cy)
          .setFlipX(p.vel.x < 0)
        if (visual.anim) {
          spr.play(visual.anim, true)
          const d = Math.max(p.w, p.h) * PROJECTILE.enemyAnimSizeMul
          spr.setDisplaySize(d, d)
        } else {
          // Stop any anim left over from a previous (animated) projectile reusing
          // this pooled sprite, else it would override the static texture frame.
          spr.anims.stop()
          spr.setTexture(visual.texture)
          spr.setDisplaySize(
            p.w * PROJECTILE.enemyStaticSizeMul,
            p.h * PROJECTILE.enemyStaticSizeMul,
          )
        }
        if (visual.tint !== undefined) spr.setTintFill(visual.tint)
        else spr.clearTint()
        rect?.setVisible(false)
      } else if (p && rect) {
        rect
          .setVisible(true)
          .setPosition(p.pos.x + p.w / 2, p.pos.y + p.h / 2)
          .setSize(p.w, p.h)
        spr?.setVisible(false)
      } else {
        rect?.setVisible(false)
        spr?.setVisible(false)
      }
    }
  }

  /**
   * Sync the enemy sprite pool; dead enemies are hidden, animated per kind. The
   * render-only white hit-flash is derived here by diffing each enemy's HP since
   * the last frame.
   */
  private renderEnemies(state: MatchState): void {
    const enemies = state.enemies
    while (this.enemySprites.length < enemies.length) {
      this.enemySprites.push(this.scene.add.sprite(0, 0, 'zombie-idle'))
    }
    this.enemySprites.forEach((sprite, i) => {
      const e = enemies[i]
      // Flash white the frame an enemy's HP drops (juice; render-derived).
      if (e && e.hp < (this.enemyHp[i] ?? Infinity) && e.state !== 'dead') {
        this.enemyFlash[i] = HIT_FLASH
      }
      if (e) this.enemyHp[i] = e.hp
      if (e && e.state !== 'dead') {
        sprite.setVisible(true)
        // The boss kind paints with its variant skin (boss1/2/3).
        const entity = e.kind === 'boss' ? `boss${e.variant ?? 1}` : e.kind
        applySprite(sprite, entity, enemyAnim(e.state), e.body, e.facing)
        if ((this.enemyFlash[i] ?? 0) > 0) sprite.setTintFill(COLOR.hitFlash)
        else sprite.clearTint()
      } else {
        // First frame an enemy is dead: pop a one-shot explosion at its center
        // (bigger for a boss), then leave the sprite hidden for good.
        if (e && e.state === 'dead' && !this.enemyExploded[i]) {
          this.enemyExploded[i] = true
          const cx = e.body.pos.x + e.body.w / 2
          const cy = e.body.pos.y + e.body.h / 2
          const isBoss = e.kind === 'boss'
          playEffect(
            this.scene,
            'explosion',
            cx,
            cy,
            isBoss ? DEATH_BURST.bossExplosionScale : DEATH_BURST.enemyExplosionScale,
          )
          const shake = isBoss ? DEATH_BURST.bossShake : DEATH_BURST.enemyShake
          this.scene.cameras.main.shake(shake.ms, shake.intensity)
        }
        sprite.setVisible(false)
      }
    })
  }

  /** Sync the chest sprite pool; opened chests are hidden. */
  private renderChests(state: MatchState): void {
    while (this.chestSprites.length < state.chests.length) {
      this.chestSprites.push(this.scene.add.image(0, 0, TILE.chest).setOrigin(0.5, 1))
    }
    this.chestSprites.forEach((sprite, i) => {
      const c = state.chests[i]
      if (c && !c.opened) {
        // Drawn a bit larger than the hitbox, sitting on its bottom edge.
        sprite
          .setVisible(true)
          .setDisplaySize(c.w + CHEST_DRAW_PAD.w, c.h + CHEST_DRAW_PAD.h)
          .setPosition(c.x + c.w / 2, c.y + c.h)
      } else {
        sprite.setVisible(false)
      }
    })
  }

  /** Sync the enemy-drop pool: each uncollected drop shows its reward icon, bobbing. */
  private renderDrops(state: MatchState): void {
    while (this.dropSprites.length < state.drops.length) {
      this.dropSprites.push(
        this.scene.add.image(0, 0, ICON.heart).setOrigin(0.5, 0.5).setDepth(DEPTH.drop),
      )
    }
    const t = this.scene.time.now
    this.dropSprites.forEach((spr, i) => {
      const d = state.drops[i]
      if (d && !d.opened) {
        const icon = rewardIcon(d.reward)
        spr.setVisible(true).setTexture(icon.key, icon.frame ?? 0)
        if (icon.tint !== undefined) spr.setTint(icon.tint)
        else spr.clearTint()
        const bob = Math.sin(t / DROP.bobPeriodMs + i) * DROP.bobAmplitude
        spr
          .setDisplaySize(d.w + DROP.drawPad, d.h + DROP.drawPad)
          .setPosition(d.x + d.w / 2, d.y + d.h / 2 + bob)
      } else {
        spr.setVisible(false)
      }
    })
  }
}
