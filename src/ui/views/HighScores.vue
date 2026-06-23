<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
const ordinal = (i: number): string => String(i + 1).padStart(2, '0')
</script>

<template>
  <div class="overlay">
    <div class="panel-wood card">
      <h2 class="heading">HIGH SCORES</h2>

      <ol v-if="game.scores.length" class="board">
        <li
          v-for="(s, i) in game.scores"
          :key="i"
          class="row"
          :class="{ fresh: i === game.lastRank }"
        >
          <span class="rank">{{ ordinal(i) }}</span>
          <span class="name">{{ s.name }}</span>
          <span class="pts">{{ String(s.score).padStart(6, '0') }}</span>
        </li>
      </ol>
      <p v-else class="empty">NO SCORES YET — BE THE FIRST</p>

      <div class="actions">
        <button class="btn-pixel is-primary" @click="game.startGame()">PLAY AGAIN</button>
        <button class="btn-pixel" @click="game.backToMenu()">MENU</button>
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
  gap: 1.6cqw;
  padding: 2.6cqw 5cqw;
  text-align: center;
  min-width: 54cqw;
}
.heading {
  margin: 0;
  font-size: 3.2cqw;
  color: var(--wood-brown);
  text-shadow: 1px 1px 0 var(--fg);
  letter-spacing: 2px;
}
.board {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.2cqw;
  line-height: 1.25;
}
.row {
  display: grid;
  grid-template-columns: 5cqw 1fr auto;
  align-items: center;
  gap: 2cqw;
  font-size: 1.7cqw;
  color: var(--ink);
  padding: 0.25cqw 1.2cqw;
}
.rank {
  color: var(--wood-brown);
  text-align: right;
}
.name {
  text-align: left;
  letter-spacing: 3px;
}
.pts {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
/* The run just entered: glows and pulses so the player spots it. */
.row.fresh {
  color: var(--blood);
  background: var(--wood-brown-a22);
  border-radius: 0.6cqw;
  animation: pulse 0.8s ease-in-out infinite;
}
.row.fresh .rank {
  color: var(--blood);
}
@keyframes pulse {
  50% {
    opacity: 0.55;
  }
}
.empty {
  margin: 2cqw 0;
  font-size: 1.9cqw;
  color: var(--wood-mid);
}
.actions {
  display: flex;
  gap: 2cqw;
  margin-top: 0.6cqw;
}
/* Compact buttons so the 10-row board + actions fit the 16:9 stage. */
.actions .btn-pixel {
  font-size: 1.7cqw;
  padding: 1.1cqw 2.4cqw;
  border-width: 1.6cqw;
  border-image-width: 1.6cqw;
  min-width: 22cqw;
}
.actions .btn-pixel.is-primary {
  font-size: 1.8cqw;
  padding: 1.1cqw 2.4cqw;
}
</style>
