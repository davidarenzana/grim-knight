import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/press-start-2p/latin-400.css'
import App from '@ui/App.vue'
import { useGameStore } from '@ui/stores/game'
import './ui/style.css'

// Kick off the pixel font fetch at boot so it's ready by the time the Phaser
// canvas mounts (after the menu) and starts drawing in-game text.
if (document.fonts?.load) void document.fonts.load("16px 'Press Start 2P'")

const app = createApp(App)
app.use(createPinia())

// Connect the store to the event bus before mounting.
useGameStore().bind()

app.mount('#app')
