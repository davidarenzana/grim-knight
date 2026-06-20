<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
</script>

<template>
  <div class="menu">
    <div class="panel-wood card">
      <h1 class="title">GRIM<br />KNIGHT</h1>
      <p class="tagline">One knight. One suit of armor.<br />Far too many undead.</p>
      <button class="btn-pixel is-primary" @click="game.startGame()">START</button>
      <p class="version">v0.0.0 · greybox</p>
    </div>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 2;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3.4cqw;
  padding: 5cqw 7cqw;
  text-align: center;
}
.title {
  margin: 0;
  font-size: 7cqw;
  line-height: 1.2;
  color: #7a1f12;
  text-shadow:
    2px 2px 0 #f4ead2,
    4px 4px 0 #00000022;
  letter-spacing: 2px;
}
.tagline {
  margin: 0;
  font-size: 2cqw;
  line-height: 1.9;
  color: #5a4632;
}
.version {
  margin: 0;
  font-size: 1.7cqw;
  color: #9a8158;
}
</style>
