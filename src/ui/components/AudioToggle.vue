<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
</script>

<template>
  <button
    class="audio-toggle"
    :aria-label="game.audioOn ? 'Mute audio' : 'Unmute audio'"
    :title="game.audioOn ? 'Sound on' : 'Sound off'"
    @click="game.toggleAudio()"
  >
    {{ game.audioOn ? '🔊' : '🔇' }}
  </button>
</template>

<style scoped>
.audio-toggle {
  position: absolute;
  top: 1.5cqw;
  right: 1.5cqw;
  z-index: 50;
  width: 5cqw;
  height: 5cqw;
  display: grid;
  place-items: center;
  font-size: 2.4cqw;
  line-height: 1;
  border: 0.4cqw solid #f4ead2aa;
  border-radius: 0.6cqw;
  background: #0a0813cc;
  color: #f4ead2;
  cursor: pointer;
  padding: 0;
  transition:
    filter 80ms,
    transform 60ms;
}
.audio-toggle:hover {
  filter: brightness(1.2);
}
.audio-toggle:active {
  transform: translateY(1px);
}
</style>
