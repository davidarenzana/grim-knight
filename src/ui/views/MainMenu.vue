<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
</script>

<template>
  <div class="menu">
    <p class="tagline">One knight. One suit of armor. Far too many undead.</p>
    <button class="cta" @click="game.startGame()">▶ Start game</button>
    <p class="version">v0.0.0 · greybox</p>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 2;
}
.tagline {
  opacity: 0.8;
}
.cta {
  font: inherit;
  font-size: 18px;
  padding: 12px 24px;
  background: var(--accent);
  color: #000;
  border: none;
  cursor: pointer;
}
.cta:hover {
  filter: brightness(1.1);
}
.version {
  opacity: 0.4;
  font-size: 12px;
}
</style>
