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
    <!-- Marquee header. Hidden on the menu (the title screen shows its own),
         but kept in flow so the cabinet doesn't jump when the game starts. -->
    <h1 class="title" :class="{ 'is-hidden': game.screen === 'menu' }">GRIM KNIGHT</h1>

    <div class="cabinet">
      <div class="stage">
        <!-- The Phaser canvas is only mounted while playing or paused. -->
        <GameCanvas v-if="game.screen === 'playing' || game.screen === 'paused'" />

        <MainMenu v-if="game.screen === 'menu'" />
        <GameHud v-if="game.screen === 'playing'" />
        <PauseOverlay v-if="game.screen === 'paused'" />
        <GameOver v-if="game.screen === 'gameover' || game.screen === 'won'" />
      </div>
    </div>

    <p class="hint">An original arcade quest · insert valor to continue</p>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
}
.title {
  margin: 0;
  font-size: clamp(22px, 4vw, 40px);
  letter-spacing: 6px;
  color: var(--accent);
  text-shadow:
    3px 3px 0 #000,
    0 0 18px #ffcc0077;
}
.title.is-hidden {
  visibility: hidden;
}
/* Wood cabinet bezel — reuses the panel art's border only (no fill), so the
   game shows through the transparent center. */
.cabinet {
  width: 836px;
  max-width: 100%;
  border-style: solid;
  border-width: 22px;
  border-image-source: url('/assets/ui/panel.png');
  border-image-slice: 12;
  border-image-width: 22px;
  border-image-repeat: stretch;
  image-rendering: pixelated;
  background: #000;
  box-shadow:
    0 0 0 2px #000,
    0 10px 30px #000a;
}
.stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  display: grid;
  place-items: center;
  overflow: hidden;
  /* Make the stage a query container so the HTML HUD/overlays scale WITH the
     game view (cqw units), the way the in-canvas Phaser text already does. */
  container: stage / size;
}
.hint {
  margin: 0;
  opacity: 0.5;
  font-size: clamp(9px, 1.2vw, 13px);
  letter-spacing: 1px;
  color: var(--muted);
}
</style>
