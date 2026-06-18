<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
const bossPct = computed(() =>
  game.bossMaxHp > 0 ? Math.max(0, (game.bossHp / game.bossMaxHp) * 100) : 0,
)
</script>

<template>
  <div class="hud">
    <div class="row">
      <span>LIVES {{ game.lives }}</span>
      <span>WEAPON {{ game.weapon }}</span>
      <span>ARMOR {{ game.armor }}</span>
      <span>SCORE {{ game.score }}</span>
      <span>TIME {{ Math.ceil(game.secondsLeft) }}</span>
      <span>STAGE {{ game.level }}-{{ game.loop }}</span>
    </div>
    <button class="pause" @click="game.pause()">⏸ Pause</button>

    <div v-if="game.bossActive" class="boss">
      <span class="boss-label">BOSS</span>
      <div class="boss-bar"><div class="boss-fill" :style="{ width: bossPct + '%' }"></div></div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0 0 auto 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  z-index: 3;
  pointer-events: none;
}
.row {
  display: flex;
  gap: 16px;
  font-size: 14px;
  text-shadow: 1px 1px 0 #000;
}
.pause {
  pointer-events: auto;
  font: inherit;
  background: #0008;
  color: var(--fg);
  border: 1px solid #555;
  cursor: pointer;
}
.boss {
  position: absolute;
  top: 36px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}
.boss-label {
  font-size: 12px;
  color: #ff6b6b;
  text-shadow: 1px 1px 0 #000;
}
.boss-bar {
  width: 320px;
  height: 10px;
  background: #400;
  border: 1px solid #a00;
}
.boss-fill {
  height: 100%;
  background: #ff3b3b;
  transition: width 120ms linear;
}
</style>
