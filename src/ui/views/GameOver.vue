<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

// The campaign is an endless loop: a run only ever ends on game over.
const game = useGameStore()
</script>

<template>
  <div class="overlay">
    <div class="panel-wood card">
      <h2 class="heading defeat">GAME OVER</h2>
      <p class="score">
        <img src="/assets/icons/coin.png" alt="score" />
        {{ String(game.score).padStart(6, '0') }}
      </p>
      <div class="actions">
        <button class="btn-pixel is-primary" @click="game.restart()">RETRY</button>
        <button class="btn-pixel" @click="game.quitToMenu()">MENU</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--scrim-strong);
  z-index: 4;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.6cqw;
  padding: 4.5cqw 7cqw;
  text-align: center;
  min-width: 42cqw;
}
.heading {
  margin: 0;
  font-size: 5cqw;
  text-shadow: 1px 1px 0 var(--fg);
  letter-spacing: 2px;
}
.heading.defeat {
  color: var(--blood-deep);
}
.score {
  margin: 0.8cqw 0;
  display: inline-flex;
  align-items: center;
  gap: 1.4cqw;
  font-size: 3.6cqw;
  color: var(--wood-brown);
}
.score img {
  width: 4.2cqw;
  height: 4.2cqw;
}
.actions {
  display: flex;
  gap: 2cqw;
}
.actions .btn-pixel {
  min-width: 22cqw;
}
</style>
