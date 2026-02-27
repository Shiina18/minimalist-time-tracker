import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { setupPwaUpdateHandler } from './pwa.js'
import './main.css'

const app = createApp(App).use(router)
if (import.meta.env.DEV) {
  app.config.globalProperties.__seed = () =>
    import('./scripts/seed.js').then((m) => m.seed())
  window.__seed = () => import('./scripts/seed.js').then((m) => m.seed())
}
app.mount('#app')

if ('serviceWorker' in navigator) {
  setupPwaUpdateHandler()
}
