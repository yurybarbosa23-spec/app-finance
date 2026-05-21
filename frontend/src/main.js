import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

const app = createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')

// Força a status bar transparente sobre o conteúdo do app
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {})
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
}