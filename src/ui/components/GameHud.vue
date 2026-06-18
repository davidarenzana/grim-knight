<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
</script>

<template>
  <div class="hud">
    <div class="row">
      <span>LIVES {{ game.lives }}</span>
      <span>WEAPON {{ game.weapon }}</span>
      <span>ARMOR {{ game.armor }}</span>
      <span>SCORE {{ game.score }}</span>
    </div>
    <button class="pause" @click="game.pause()">⏸ Pause</button>
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
</style>
