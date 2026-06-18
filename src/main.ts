import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@ui/App.vue'
import { useGameStore } from '@ui/stores/game'
import './ui/style.css'

const app = createApp(App)
app.use(createPinia())

// Connect the store to the event bus before mounting.
useGameStore().bind()

app.mount('#app')
