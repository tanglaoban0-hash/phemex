import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './styles/mobile.css'
import router from './router'
import App from './App.vue'
import i18n from './i18n'
import gesture from './directives/gesture'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(i18n)
app.use(gesture)

// 注册 Service Worker (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW registered:', registration)
      
      // 强制更新 Service Worker
      registration.update()
      
      // 如果有新的 Service Worker，立即激活
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新 SW 已安装，强制跳过等待
            newWorker.postMessage({ type: 'SKIP_WAITING' })
            // 刷新页面以使用新版本
            window.location.reload()
          }
        })
      })
    })
    .catch(error => {
      console.log('SW registration failed:', error)
    })
  
  // 监听消息，当新 SW 激活时刷新
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RELOAD') {
      window.location.reload()
    }
  })
}

app.mount('#app')