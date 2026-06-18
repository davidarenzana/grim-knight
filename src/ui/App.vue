<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'
import GameCanvas from '@ui/components/GameCanvas.vue'
import MainMenu from '@ui/views/MainMenu.vue'
import GameHud from '@ui/components/GameHud.vue'
import PauseOverlay from '@ui/views/PauseOverlay.vue'
import GameOver from '@ui/views/GameOver.vue'

const game = useGameStore()
</script>

<template>
  <div class="shell">
    <h1 class="title">Arcade Knight</h1>

    <div class="stage">
      <!-- The Phaser canvas is only mounted while playing or paused. -->
      <GameCanvas v-if="game.screen === 'playing' || game.screen === 'paused'" />

      <MainMenu v-if="game.screen === 'menu'" />
      <GameHud v-if="game.screen === 'playing'" />
      <PauseOverlay v-if="game.screen === 'paused'" />
      <GameOver v-if="game.screen === 'gameover' || game.screen === 'won'" />
    </div>

    <p class="hint">SDD + TDD · pure TS core + Phaser 3 + Vue 3</p>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
.title {
  color: var(--accent);
  letter-spacing: 4px;
  margin: 0;
}
.stage {
  position: relative;
  width: 800px;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border: 2px solid #333;
  display: grid;
  place-items: center;
}
.hint {
  opacity: 0.5;
  font-size: 12px;
}
</style>
