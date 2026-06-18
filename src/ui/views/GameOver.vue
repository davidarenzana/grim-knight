<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
const won = computed(() => game.screen === 'won')
</script>

<template>
  <div class="overlay">
    <h2>{{ won ? 'Victory!' : 'Game Over' }}</h2>
    <p>Score: {{ game.score }}</p>
    <button @click="game.restart()">Retry</button>
    <button @click="game.quitToMenu()">Menu</button>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #000c;
  z-index: 4;
}
button {
  font: inherit;
  padding: 8px 20px;
  cursor: pointer;
}
</style>
