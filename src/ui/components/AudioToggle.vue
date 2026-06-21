<script setup lang="ts">
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
</script>

<template>
  <button
    class="hud-btn audio-toggle"
    :aria-label="game.audioOn ? 'Mute audio' : 'Unmute audio'"
    :title="game.audioOn ? 'Sound on' : 'Sound off'"
    @click="game.toggleAudio()"
  >
    <!-- Hand-drawn pixel-art speaker on a 16x16 grid (crisp, no AA) so it
         matches the chunky Press Start 2P / CraftPix look instead of an emoji. -->
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <!-- Speaker: magnet block + stepped horn (dark ink on cream). -->
      <g fill="#3a2417">
        <rect x="2" y="6" width="3" height="4" />
        <rect x="5" y="5" width="1" height="6" />
        <rect x="6" y="4" width="1" height="8" />
        <rect x="7" y="3" width="1" height="10" />
      </g>
      <!-- ON: two sound waves. -->
      <g v-if="game.audioOn" fill="#3a2417">
        <rect x="9" y="6" width="1" height="4" />
        <rect x="11" y="4" width="1" height="2" />
        <rect x="12" y="6" width="1" height="4" />
        <rect x="11" y="10" width="1" height="2" />
      </g>
      <!-- OFF: a red X. -->
      <g v-else fill="#c0291a">
        <rect x="9" y="6" width="1" height="1" />
        <rect x="10" y="7" width="1" height="1" />
        <rect x="11" y="8" width="1" height="1" />
        <rect x="12" y="9" width="1" height="1" />
        <rect x="12" y="6" width="1" height="1" />
        <rect x="11" y="7" width="1" height="1" />
        <rect x="10" y="8" width="1" height="1" />
        <rect x="9" y="9" width="1" height="1" />
      </g>
    </svg>
  </button>
</template>

<style scoped>
/* Top control of the corner stack (the pause button sits just below it during
   play); centered in the HUD's reserved right band. */
.audio-toggle {
  position: absolute;
  top: 1.6cqw;
  right: 4.15cqw;
  z-index: 50;
}
</style>
