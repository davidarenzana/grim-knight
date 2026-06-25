# Game Design Document — Grim Knight

> Full game structure (design-complete, built incrementally). Original IP inspired by 90s
> action-platformers. No Capcom assets or names.

## 1. Pitch

A lone knight crosses a cursed land to rescue the princess from the Demon Lord. One hit strips his
armor; a second hit kills him. Tight controls, fixed jump arcs, relentless enemies, and the classic
twist: beating the last boss never ends the game — it sends you around again, harder, forever — the **endless loop**.

## 2. Core pillars

1. **Fair but brutal** — deaths are readable; patterns are learnable.
2. **Committed movement** — the jump arc is mostly fixed; positioning matters.
3. **Weapon variety** — each weapon changes range/arc/rate, no strict upgrade ladder.
4. **Arcade loop** — score, lives, endless escalating loop; the high-score table is the reward.

## 3. Player model

- **Movement:** walk left/right, crouch, climb ladders, jump (near-fixed horizontal arc).
- **Armor (2 hits):** `armored` → `underwear` → `dead`. Losing armor is a recoverable mistake; the next
  hit is fatal. Armor pickups restore the suit.
- **Attack:** throw the active weapon; fire rate and projectile behavior depend on the weapon.
- **Lives & continues:** start with 3 lives; lose one on death; continues reset score (arcade style).

### Weapons (one active at a time, swapped via chests)

| Weapon   | Behavior                           | Notes                  |
| -------- | ---------------------------------- | ---------------------- |
| Lance    | Straight, fast, 2 on screen        | Default, reliable      |
| Dagger   | Fastest rate, short reach          | High DPS up close      |
| Torch    | Arcs, leaves fire on ground        | Area denial            |
| Axe      | Arcs high                          | Hits elevated foes     |
| Shield   | Blocks projectiles, short range    | Defensive              |
| (Cursed) | Magician chest may downgrade/curse | Risk in opening chests |

## 4. Enemies (greybox → art later)

- **Zombie** — rises from the ground in waves, walks toward the player.
- **Flyer (demon)** — swoops in sine/arc patterns.
- **Plant** — stationary, spits projectiles.
- **Ogre** — heavy, charges, takes several hits.
- **Crow / bat swarm** — fast, erratic, low HP.
- (More added per spec during Phase 4.)

## 5. Bosses (one per stage, original designs)

1. **Cyclops Sentinel** — slow stomps, rock throws.
2. **Twin Gargoyles** — alternating dive attacks.
3. **Bog Hydra** — multiple heads, must be cleared in order.
4. **Iron Golem** — armored, weak point opens after attacks.
5. **Wraith Queen** — teleports, summons adds.
6. **Demon Lord** — final boss; only beatable with a specific weapon (classic gate).

## 6. Levels (6 stages)

| #   | Stage          | Theme                      | Hazards                 | Boss             |
| --- | -------------- | -------------------------- | ----------------------- | ---------------- |
| 1   | Graveyard      | rising zombies, ladders    | gravestones cover       | Cyclops Sentinel |
| 2   | Haunted Forest | flyers, plants             | vertical climb, spikes  | Twin Gargoyles   |
| 3   | Swamp Caverns  | water, drowning            | rising water            | Bog Hydra        |
| 4   | Iron Fortress  | ogres, traps               | crushers, spikes        | Iron Golem       |
| 5   | Frozen Spires  | ice physics (low friction) | wind gusts              | Wraith Queen     |
| 6   | Demon Keep     | gauntlet of all enemies    | lava, collapsing floors | Demon Lord       |

Each stage has a **timer**; running out costs a life.

## 7. Endless loop

Clearing the final stage never ends the game: it restarts at stage 1 on the next, harder loop. A run
ends only on game over (out of lives), so the high-score table is the reward. Difficulty is bucketed into
three named tiers that keep escalating each cycle:

- **MORTAL** (loop 1) — the baseline quest.
- **DAMNED** (loop 2) — tougher enemies, a stricter clock, richer payout.
- **INFERNAL** (loop 3+) — the hardest tier, ramping a little more every loop, forever.

Clearing all six stages the first time still earns a celebratory **VICTORY!** banner, but play continues
into the next tier. The model is pure (`src/core/rules/difficulty.ts`): tougher enemies (`enemyHpMul`),
less time (`timeScale`, floored at 0.55), and a score multiplier (`scoreMul`). See `specs/endless-loop.md`.

## 8. Scoring

- Points for kills, chests, time bonus per stage, no-damage bonus.
- Extra life at score thresholds (e.g. every 50k).
- High-score table (local, persisted).

## 9. Controls (default)

NES-style layout: move with the right hand (arrows), act with the left hand (Z/X).

- Left / Right (or A / D): move
- Up (or W): jump — or climb up when on a ladder
- Down (or S): crouch — or climb down when on a ladder
- Z (or Space): throw the active weapon
- X: swap to the next weapon
- Pause: via the HUD button (Esc/P planned)

Entry flow: a title screen (START / SELECT STAGE) and a stage-select screen front the game (`src/ui/views/`).

## 10. Build order (see `docs/PLAN.md`)

Greybox vertical slice (player + 1 enemy + 1 stage + 1 boss) first, then fill the table above reusing the
established systems. Art and audio come last (asset contracts defined per spec).

## 11. Implementation status (v1.0, shipped 2026-06-25)

This GDD is the **design target**. The game shipped as **v1.0** (live on Vercel, full CI/CD); the list
below records what made the 1.0 build versus the few design items deliberately left as future scope.

**Shipped in 1.0:**

- **Player / armor / weapons:** lance, dagger, torch, axe, plus the magician **curse** chest. 2-hit armor
  (armored → underwear → dead) with i-frames, knockback and armor pickups.
- **Enemies:** zombie, flyer, plant, ogre, centipede (fast crawler), turtle (armored ranged) and bloated
  (arcing-bolt caster). Ground enemies are ledge-aware (turn at pits) and fire their own projectiles.
- **Bosses:** **three escalating variant skins** (one per pair of stages: more HP + a wider/faster spread
  volley), with a dedicated HUD HP bar.
- **Levels:** all 6 stages with per-stage **visual themes** (ruins/forest/cave/castle/ice/hell), the
  **endless escalating loop** (MORTAL → DAMNED → INFERNAL), camera scroll, stage timer, moving platforms
  and the position-triggered spawner. Hazards: **jumpable pits (fall-out)** and **spike/lava contact strips**.
- **Scoring:** points for kills/chests, the score multiplier per loop tier, and the persisted **top-ten
  high-score table** with 3-letter initials.
- **Audio:** procedural Web Audio SFX + music synthesised at runtime, with an on/off toggle (persisted).
- **Build / deploy:** Vite production build, GitHub Actions CI (quality + e2e) and Vercel deploy from `main`.

**Deliberate future scope (designed above, not in 1.0):** the **Shield** weapon, the **crow/bat swarm**
enemy, the **six unique boss designs/patterns** of §5 (1.0 ships three reused variant skins instead), and
the richer §6 hazards (rising water, crushers, wind gusts, collapsing floors).
