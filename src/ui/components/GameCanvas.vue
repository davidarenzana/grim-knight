<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type Phaser from 'phaser'
import { createGame } from '@engine/game'

const container = ref<HTMLDivElement | null>(null)
let game: Phaser.Game | null = null

onMounted(() => {
  if (container.value) game = createGame(container.value)
})

onBeforeUnmount(() => {
  game?.destroy(true)
  game = null
})
</script>

<template>
  <div ref="container" class="canvas-host"></div>
</template>

<style scoped>
.canvas-host {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
</style>
