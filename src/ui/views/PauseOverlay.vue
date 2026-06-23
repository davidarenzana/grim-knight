<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
</script>

<template>
  <div class="overlay">
    <div class="panel-wood card">
      <h2 class="heading">PAUSED</h2>
      <button class="btn-pixel is-primary" @click="game.resume()">RESUME</button>
      <button class="btn-pixel" @click="game.quitToMenu()">QUIT</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--scrim);
  z-index: 4;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.6cqw;
  padding: 5cqw 7cqw;
  min-width: 36cqw;
}
.heading {
  margin: 0 0 1cqw;
  font-size: 4.5cqw;
  color: var(--blood-deep);
  text-shadow: 1px 1px 0 var(--fg);
  letter-spacing: 2px;
}
.card .btn-pixel {
  min-width: 40cqw;
}
</style>
