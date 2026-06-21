<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'
import { LEVELS } from '@core/level/level'

const game = useGameStore()
const stages = LEVELS.map((l, i) => ({ index: i, name: l.name }))
</script>

<template>
  <div class="overlay">
    <div class="panel-wood card">
      <h2 class="heading">SELECT STAGE</h2>
      <div class="grid">
        <button
          v-for="s in stages"
          :key="s.index"
          class="btn-pixel stage"
          @click="game.startAtLevel(s.index)"
        >
          {{ s.index + 1 }} · {{ s.name }}
        </button>
      </div>
      <button class="btn-pixel back" @click="game.backToMenu()">BACK</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: #000a;
  z-index: 4;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.4cqw;
  padding: 3cqw 4cqw;
  text-align: center;
}
.heading {
  margin: 0;
  font-size: 3.4cqw;
  color: #7a1f12;
  text-shadow: 1px 1px 0 #f4ead2;
  letter-spacing: 2px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.6cqw 2cqw;
}
/* Compact buttons so all six stages + BACK fit inside the 16:9 stage. */
.stage {
  font-size: 1.5cqw;
  padding: 1.2cqw 1.4cqw;
  border-width: 1.8cqw;
  border-image-width: 1.8cqw;
  min-width: 30cqw;
  white-space: nowrap;
}
.back {
  font-size: 1.8cqw;
  padding: 1.2cqw 2.6cqw;
  border-width: 1.8cqw;
  border-image-width: 1.8cqw;
}
</style>
