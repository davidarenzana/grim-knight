<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
</script>

<template>
  <div class="menu">
    <!-- Atmospheric backdrop reused from the first stage. -->
    <div class="backdrop"></div>
    <div class="vignette"></div>

    <!-- Monsters lurking at the edges. -->
    <img class="boss left" src="/assets/ui/boss1.png" alt="" />
    <img class="boss right" src="/assets/ui/boss3.png" alt="" />

    <!-- Title + call to action. -->
    <div class="content">
      <h1 class="title">GRIM<br />KNIGHT</h1>
      <p class="tagline">One knight. One suit of armor.<br />Far too many undead.</p>
      <div class="actions">
        <button class="btn-pixel is-primary" @click="game.startGame()">START</button>
        <button class="btn-pixel" @click="game.openLevels()">SELECT STAGE</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 2;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: url('/assets/tiles/bg_graveyard.png') center / cover no-repeat;
  image-rendering: pixelated;
}
/* Darken toward the center-bottom so the title and button read clearly. */
.vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 35%, transparent 30%, #07050cdd 100%),
    linear-gradient(#0a0813aa, #0a081366 40%, #0a0813cc);
}

.boss {
  position: absolute;
  bottom: 0;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 6px #000a);
  pointer-events: none;
}
.boss.left {
  left: 1cqw;
  height: 34cqw;
}
.boss.right {
  right: 1cqw;
  height: 30cqw;
  transform: scaleX(-1); /* face the center */
}

.content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4cqw;
  text-align: center;
  padding-bottom: 2cqw;
}
.title {
  margin: 0;
  font-size: 7.4cqw;
  line-height: 1.15;
  letter-spacing: 3px;
  color: var(--accent);
  text-shadow:
    3px 3px 0 #000,
    -2px -2px 0 #000,
    2px -2px 0 #000,
    -2px 2px 0 #000,
    0 0 22px #ff8a00aa;
}
.tagline {
  margin: 0;
  font-size: 1.9cqw;
  line-height: 1.7;
  color: #e8dcc0;
  text-shadow: 2px 2px 0 #000;
}
.actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.6cqw;
}
/* Smaller, stacked menu buttons (scoped so other views keep the larger ones). */
.actions .btn-pixel {
  font-size: 1.7cqw;
  padding: 1.3cqw 2.4cqw;
  border-width: 1.7cqw;
  border-image-width: 1.7cqw;
  min-width: 26cqw;
}
.actions .btn-pixel.is-primary {
  font-size: 1.8cqw;
  padding: 1.3cqw 2.4cqw;
}
</style>
