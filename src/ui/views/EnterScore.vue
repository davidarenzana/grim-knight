<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '@ui/stores/game'

const game = useGameStore()
const MAX = 3

/** The letters typed so far (0-3 chars, A-Z). */
const initials = ref('')
const slots = computed(() => Array.from({ length: MAX }, (_, i) => initials.value[i] ?? ''))
/** Which slot the next letter fills (clamped so the last slot stays lit). */
const cursor = computed(() => Math.min(initials.value.length, MAX - 1))

function confirm(): void {
  // sanitizeName (in the store) pads short / empty initials, so any length is fine.
  game.submitScore(initials.value)
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    confirm()
    e.preventDefault()
    return
  }
  if (e.key === 'Backspace') {
    initials.value = initials.value.slice(0, -1)
    e.preventDefault()
    return
  }
  // A single A-Z letter (case-insensitive) fills the next slot.
  if (/^[a-zA-Z]$/.test(e.key) && initials.value.length < MAX) {
    initials.value += e.key.toUpperCase()
    e.preventDefault()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="overlay">
    <div class="panel-wood card">
      <h2 class="heading">NEW HIGH SCORE</h2>
      <p class="score">
        <img src="/assets/icons/coin.png" alt="score" />
        {{ String(game.pendingScore).padStart(6, '0') }}
      </p>
      <p class="prompt">ENTER YOUR INITIALS</p>
      <div class="slots">
        <span v-for="(ch, i) in slots" :key="i" class="slot" :class="{ active: i === cursor }">{{
          ch || '_'
        }}</span>
      </div>
      <p class="hint">TYPE A-Z · ENTER TO CONFIRM</p>
      <button class="btn-pixel is-primary" @click="confirm()">CONFIRM</button>
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
  gap: 1.8cqw;
  padding: 3.4cqw 7cqw;
  text-align: center;
  min-width: 44cqw;
}
.heading {
  margin: 0;
  font-size: 4cqw;
  color: var(--wood-brown);
  text-shadow: 1px 1px 0 var(--fg);
  letter-spacing: 2px;
}
.score {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 1.4cqw;
  font-size: 3.4cqw;
  color: var(--wood-brown);
}
.score img {
  width: 4cqw;
  height: 4cqw;
}
.prompt {
  margin: 0;
  font-size: 1.8cqw;
  color: var(--wood-mid);
}
.slots {
  display: flex;
  gap: 2.4cqw;
}
.slot {
  width: 7cqw;
  font-size: 7cqw;
  line-height: 1;
  color: var(--ink);
  border-bottom: 0.6cqw solid var(--wood-brown-a55);
}
.slot.active {
  color: var(--blood);
  border-bottom-color: var(--blood);
  animation: blink 0.8s steps(1) infinite;
}
@keyframes blink {
  50% {
    opacity: 0.25;
  }
}
.hint {
  margin: 0;
  font-size: 1.5cqw;
  color: var(--wood-mid);
  opacity: 0.85;
}
</style>
