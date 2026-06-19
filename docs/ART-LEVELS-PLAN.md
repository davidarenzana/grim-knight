# Plan — Distinct level themes, new creatures & GnG-style stages

> Living plan for the art + level overhaul requested 2026-06-19. Goal: every stage looks
> **different** (its own tileset/background), use the new monster & boss art, and reshape the
> levels to resemble the classic _Ghosts'n Goblins_ maps (multi-tier platforms, ladders, pits,
> hazards, structures) the reference images show.
>
> Follows the project's SDD+TDD flow (AGENTS.md §5): core changes get a spec + failing test first.

## Source art (in `test_art/`, to be imported into `public/assets/`)

| Pack                | Grid  | Use                                                                                     |
| ------------------- | ----- | --------------------------------------------------------------------------------------- |
| `tileset/` (ruins)  | 128px | Already shipped as the "Graveyard" ruins look (keep).                                   |
| `swap-tileset/`     | 32px  | Lush **forest** (trees bg + green tiles, vines, chest/coin/key).                        |
| `dungeons-tileset/` | 64px  | **Cave** (rock, pale bg) and **hell** (lava tiles, bright/red bg, lava drips, torches). |
| `medieval-tileset/` | 48px  | **Castle** (red brick, blue stone, spikes, doors, barrels) — the most GnG-like.         |
| `swap-monster/`     | 72px  | New enemies: Centipede, Battle turtle, Big bloated.                                     |
| `bosses/1,2,3`      | 96px  | Three new boss skins.                                                                   |

## Theme assignment (6 stages, each visually distinct)

| #   | Stage          | Theme  | Tiles / Background                                            | Hazard       |
| --- | -------------- | ------ | ------------------------------------------------------------- | ------------ |
| 0   | Graveyard      | ruins  | current CraftPix ruins (grass + dusk) — unchanged             | pits         |
| 1   | Haunted Forest | forest | swap-tileset green tiles + forest background                  | pits         |
| 2   | Swamp Caverns  | cave   | dungeons rock tiles + pale cave background                    | pits         |
| 3   | Iron Fortress  | castle | medieval red-brick + dark sky                                 | spikes, pits |
| 4   | Frozen Spires  | ice    | medieval/dungeon stone **blue-tinted** + cold tinted backdrop | pits         |
| 5   | Demon Keep     | hell   | dungeons lava tiles + bright/red background + lava drips      | lava, pits   |

> Ice has no dedicated pack: reuse the stone tiles with a cyan/white Phaser tint + a blue-tinted
> backdrop. Castle/hell backgrounds: the medieval set ships no full-screen bg, so use a dark
> gradient/solid (or a tinted dungeon bg) behind the brick.

## New creatures

**Enemies** (`swap-monster/`, 72px sheets, full idle/walk/attack/hurt/death anims):

| Kind        | Behavior (new `core/enemies/*`)                                      | Art                    |
| ----------- | -------------------------------------------------------------------- | ---------------------- |
| `centipede` | Fast, low-HP ground crawler (melee chaser; quicker than the zombie). | Centipede sheets       |
| `turtle`    | Slow armored walker that fires straight `Bullet` shots on a cadence. | Battle turtle + Bullet |
| `bloated`   | Slow caster that lobs an arcing `Bolt` (area denial).                | Big bloated + Bolt     |

**Bosses** (`bosses/1,2,3`, 96px): three skins assigned across the six stages via a boss
`variant` field, each with its own stats/attack tuning (reuses the existing boss kind, no new
per-kind module).

## New mechanics (needed to match the reference maps)

1. **Fall death** — ground now has gaps/pits; falling below the world bottom costs a life
   (today the ground is one full-width solid, so this doesn't exist yet).
2. **Hazards** — `LevelDef.hazards: AABB[]` (spikes/lava) that damage the player on contact,
   respecting i-frames. Rendered with the theme's spike/lava tile.
3. **Multi-tier geometry** — redesign each stage with stacked platforms, ladders connecting
   tiers, pits and structures (towers, brick rooms) echoing the GnG level 1 / level 5 maps,
   instead of the current near-flat ground + a few ledges.

---

## Tasks (phased)

### Phase A — Visual variety (no game-logic change; biggest visual win)

- **A1** Add `theme` to `LevelDef` + a theme→asset-keys map in `tiles.ts` (ground/platform/ladder/crate/bg per theme).
- **A2** Import & slice the chosen tile/background PNGs into `public/assets/tiles/<theme>/`; pick representative tiles; set up the ice tint.
- **A3** Rewrite `GameScene` scenery build to read the active theme's keys (replace the single `TILE.ground`/`backgroundFor`).
- **A4** Per-level headless screenshot pass; confirm all six read as distinct; tune scale/tint.

### Phase B — New enemies (core TDD + art)

- **B1** `centipede`: spec + `core/enemies/centipede.ts` + tests (fast walker).
- **B2** `turtle`: spec + `core/enemies/turtle.ts` + tests (ranged straight shot + Bullet projectile).
- **B3** `bloated`: spec + `core/enemies/bloated.ts` + tests (arcing Bolt lob).
- **B4** Import sprite sheets to `public/assets/sprites/<kind>/`; register in `SPRITES`; wire render + combat for the new kinds.
- **B5** Add the new kinds to the stage spawn tables (position-triggered) for thematic variety.

### Phase C — GnG-style level mechanics (core TDD)

- **C1** Fall death: spec + rule (player below world bottom → `loseLife`/respawn) + test; wire in `GameScene`/`tick`.
- **C2** Hazards: spec + `LevelDef.hazards` + contact-damage rule (i-frames) + test; render spike/lava tiles.
- **C3** Redesign all six stages' geometry (pits, tiers, ladders, structures) to resemble the reference maps; keep `level.test.ts` invariants green.

### Phase D — Boss variety (art + light core)

- **D1** Boss `variant` field → per-stage boss skin (bosses 1/2/3) + per-variant stat/attack tuning; render + HUD unchanged.

### Phase E — Docs & verification

- **E1** Update `specs/`, `memory/progress.md`, `memory/glossary.md` (new enemies/hazards/themes), `AGENTS.md` §8, `docs/GDD.md`; add ADRs for the theme system and the hazard/fall-death rules.
- **E2** Full gate per phase: `pnpm test` + `typecheck` + `lint` + `build` + headless screenshots; conventional commits.

## Suggested order

A → B → C → D → E, committing after each phase. Phase A alone delivers the "each level looks
different" request; B/C/D layer on the creatures and the GnG-style depth.
