<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
</script>

<template>
  <div class="overlay">
    <h2>Paused</h2>
    <button @click="game.resume()">Resume</button>
    <button @click="game.quitToMenu()">Quit to menu</button>
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
  background: #000a;
  z-index: 4;
}
button {
  font: inherit;
  padding: 8px 20px;
  cursor: pointer;
}
</style>
