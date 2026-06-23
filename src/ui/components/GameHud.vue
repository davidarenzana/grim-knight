<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
const bossPct = computed(() =>
  game.bossMaxHp > 0 ? Math.max(0, (game.bossHp / game.bossMaxHp) * 100) : 0,
)
const armored = computed(() => game.armor === 'armored')
const lowTime = computed(() => Math.ceil(game.secondsLeft) <= 10)
</script>

<template>
  <div class="hud">
    <!-- Left cluster: survival stats -->
    <div class="panel-wood chip">
      <span class="stat">
        <img class="icon" src="/assets/icons/heart.png" alt="lives" />
        <span class="val">{{ game.lives }}</span>
      </span>
      <span class="sep"></span>
      <span class="stat shield" :class="armored ? 'is-armored' : 'is-exposed'">{{
        armored ? '◈' : '◇'
      }}</span>
      <span class="sep"></span>
      <span class="stat weapon">{{ game.weapon }}</span>
    </div>

    <!-- Right cluster: progress stats -->
    <div class="panel-wood chip">
      <span class="stat">
        <img class="icon" src="/assets/icons/coin.png" alt="score" />
        <span class="val">{{ String(game.score).padStart(5, '0') }}</span>
      </span>
      <span class="sep"></span>
      <span class="stat">
        <span class="lbl">ST</span>
        <span class="val">{{ game.level }}-{{ game.loop }}</span>
      </span>
      <span class="sep"></span>
      <span class="stat" :class="{ 'is-low': lowTime }">
        <span class="lbl">TIME</span>
        <span class="val">{{ Math.ceil(game.secondsLeft) }}</span>
      </span>
    </div>

    <!-- Pause: corner button, paired with the audio toggle (same cream chrome) -->
    <button class="hud-btn pause" aria-label="Pause" title="Pause" @click="game.pause()">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <g fill="#3a2417">
          <rect x="4" y="3" width="3" height="10" />
          <rect x="9" y="3" width="3" height="10" />
        </g>
      </svg>
    </button>

    <!-- Boss health -->
    <div v-if="game.bossActive" class="boss">
      <span class="boss-label">BOSS</span>
      <div class="boss-bar">
        <div class="boss-fill" :style="{ width: bossPct + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0 0 auto 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.6cqw 1.8cqw;
  /* leave room on the right so the absolute pause button never overlaps a chip */
  padding-right: 12.5cqw;
  z-index: 3;
  pointer-events: none;
  gap: 1.4cqw;
}

.chip {
  display: flex;
  align-items: center;
  gap: 1.2cqw;
  padding: 1cqw 1.4cqw;
  font-size: 2cqw;
  border-width: 2.2cqw;
  border-image-width: 2.2cqw;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 0.8cqw;
  white-space: nowrap;
}
.icon {
  width: 3cqw;
  height: 3cqw;
  display: block;
}
.val {
  color: var(--ink);
}
.lbl {
  font-size: 1.4cqw;
  color: var(--wood-light);
}
.weapon {
  text-transform: uppercase;
  color: var(--wood-brown);
}
.sep {
  width: 2px;
  height: 2.4cqw;
  background: var(--overlay-faint);
}

/* Armor state pip */
.shield {
  font-size: 2.8cqw;
  line-height: 1;
}
.is-armored {
  color: var(--hud-accent);
}
.is-exposed {
  color: var(--blood);
}

/* Time running out */
.is-low .val,
.is-low .lbl {
  color: var(--blood);
  animation: blink 0.6s steps(2, start) infinite;
}
@keyframes blink {
  50% {
    opacity: 0.35;
  }
}

/* Lower control of the corner stack: same column as the audio button, with a
   matching gap (4.2cqw button + 1.2cqw gap below its 1.6cqw top). */
.pause {
  position: absolute;
  top: 7cqw;
  right: 4.15cqw;
  pointer-events: auto;
}

/* Boss bar */
.boss {
  position: absolute;
  top: 12cqw;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6cqw;
}
.boss-label {
  font-size: 2cqw;
  color: var(--accent-bright);
  text-shadow:
    0 0 6px var(--hp-glow),
    1px 1px 0 var(--outline);
}
.boss-bar {
  width: 46cqw;
  height: 2.4cqw;
  background: var(--hp-track);
  border: 2px solid var(--outline);
  box-shadow:
    inset 2px 2px 0 var(--hp-bevel-light),
    inset -2px -2px 0 var(--hp-bevel-dark);
  padding: 1px;
}
.boss-fill {
  height: 100%;
  background: linear-gradient(var(--hp-fill-top), var(--hp-fill-bot));
  box-shadow: inset 0 2px 0 var(--hp-highlight);
  transition: width 120ms linear;
}
</style>
