<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
const won = computed(() => game.screen === 'won')
const trueVictory = computed(() => won.value && game.loop >= 2)
const heading = computed(() =>
  won.value ? (trueVictory.value ? 'TRUE VICTORY' : 'VICTORY') : 'GAME OVER',
)
</script>

<template>
  <div class="overlay">
    <div class="panel-wood card">
      <div v-if="won" class="stars">
        <img src="/assets/icons/star.png" alt="" />
        <img src="/assets/icons/star.png" alt="" class="big" />
        <img src="/assets/icons/star.png" alt="" />
      </div>
      <h2 class="heading" :class="{ defeat: !won }">{{ heading }}</h2>
      <p v-if="trueVictory" class="sub">You cleared the second quest.</p>
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
  background: #000c;
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
.stars {
  display: flex;
  align-items: flex-end;
  gap: 1.4cqw;
}
.stars img {
  width: 5.6cqw;
  height: 5.6cqw;
}
.stars img.big {
  width: 7.6cqw;
  height: 7.6cqw;
  margin-bottom: 0.4cqw;
}
.heading {
  margin: 0;
  font-size: 5cqw;
  color: #2f7a2f;
  text-shadow: 1px 1px 0 #f4ead2;
  letter-spacing: 2px;
}
.heading.defeat {
  color: #7a1f12;
}
.sub {
  margin: 0;
  font-size: 2cqw;
  color: #5a4632;
}
.score {
  margin: 0.8cqw 0;
  display: inline-flex;
  align-items: center;
  gap: 1.4cqw;
  font-size: 3.6cqw;
  color: #7a4a12;
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
