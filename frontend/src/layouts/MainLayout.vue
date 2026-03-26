<template>
  <div class="main-layout">
    <header class="header">
      <div class="logo" @click="$router.push('/trade/home')">
        <img src="/phemex-full-logo.png" class="logo-full" alt="Phemex" />
      </div>
      <nav class="nav desktop-nav">
        <router-link to="/trade/home" class="nav-item" :class="{ active: $route.path === '/trade/home' }">
          <el-icon><House /></el-icon>
          <span>{{ $t('nav.home') }}</span>
        </router-link>
        <router-link to="/trade/market" class="nav-item" :class="{ active: $route.path === '/trade/market' }">
          <el-icon><TrendCharts /></el-icon>
          <span>{{ $t('nav.market') }}</span>
        </router-link>
        <router-link to="/trade/option" class="nav-item" :class="{ active: $route.path === '/trade/option' }">
          <el-icon><Timer /></el-icon>
          <span>{{ $t('nav.options') }}</span>
        </router-link>
        <router-link to="/trade" class="nav-item" :class="{ active: $route.path === '/trade' }">
          <el-icon><Wallet /></el-icon>
          <span>{{ $t('nav.trade') }}</span>
        </router-link>
        <router-link to="/trade/assets" class="nav-item" :class="{ active: $route.path === '/trade/assets' }">
          <el-icon><Wallet /></el-icon>
          <span>{{ $t('nav.assets') }}</span>
        </router-link>
      </nav>
      <div class="header-actions">
        <!-- 客服按钮 - 移动端显示 -->
        <el-button 
          class="mobile-service-btn" 
          text
          @click="openChat"
        >
          <el-icon :size="20"><Service /></el-icon>
        </el-button>
        
        <!-- 语言切换 - 移动端显示 -->
        <el-dropdown @command="changeLanguage" class="language-switch mobile-lang">
          <span class="language-btn">
            {{ currentLangFlag }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="zhHant">🇭🇰 繁體中文</el-dropdown-item>
              <el-dropdown-item command="zhHans">🇨🇳 简体中文</el-dropdown-item>
              <el-dropdown-item command="en">🇺🇸 English</el-dropdown-item>
              <el-dropdown-item command="ja">🇯🇵 日本語</el-dropdown-item>
              <el-dropdown-item command="ko">🇰🇷 한국어</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <div class="user">
          <el-dropdown v-if="userStore.isLogin">
            <span class="user-name">
              {{ userStore.userInfo?.username || $t('common.user') }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$router.push('/trade/security')">安全中心</el-dropdown-item>
                <el-dropdown-item @click="handleLogout">{{ $t('common.logout') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <router-link v-else to="/login" class="login-btn">{{ $t('login.loginBtn') }}</router-link>
        </div>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
    <ChatWidget v-model="showChat" />
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { ref, computed } from 'vue'
import { House, TrendCharts, Timer, Wallet, Lock, ArrowDown, Service } from '@element-plus/icons-vue'
import ChatWidget from '@/components/ChatWidget.vue'

// 引入移动端样式
import '@/styles/mobile.css'

const userStore = useUserStore()
const router = useRouter()
const { locale } = useI18n()

// PWA安装
const showInstallBtn = ref(false)
const deferredPrompt = ref(null)
const showChat = ref(false)

const openChat = () => {
  showChat.value = true
}

// 监听PWA安装事件
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstallBtn.value = true
  })

  window.addEventListener('appinstalled', () => {
    showInstallBtn.value = false
    deferredPrompt.value = null
    ElMessage.success('安装成功！')
  })
}

const installPWA = async () => {
  if (!deferredPrompt.value) {
    // iOS Safari 提示手动添加
    ElMessage({
      message: '请点击分享按钮，然后选择"添加到主屏幕"',
      type: 'info',
      duration: 5000
    })
    return
  }
  
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  
  if (outcome === 'accepted') {
    ElMessage.success('正在安装...')
  }
  
  deferredPrompt.value = null
  showInstallBtn.value = false
}

const languages = [
  { code: 'zhHant', flag: '🇭🇰', name: '繁體中文' },
  { code: 'zhHans', flag: '🇨🇳', name: '简体中文' },
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' }
]

const currentLangFlag = computed(() => {
  const lang = languages.find(l => l.code === locale.value)
  return lang ? lang.flag : '🌐'
})

const changeLanguage = (lang) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
  const langName = languages.find(l => l.code === lang)?.name || lang
  ElMessage.success(`Switched to ${langName}`)
}

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  background: #0d1117;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.logo-full {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.nav {
  display: flex;
  gap: 32px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8b949e;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.nav-item:hover,
.nav-item.active {
  color: #00d4aa;
}

.user {
  display: flex;
  align-items: center;
}

.user-name {
  color: #8b949e;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  padding: 6px 8px;
}

.user-name:hover {
  color: #00d4aa;
}

.login-btn {
  color: #00d4aa;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid #00d4aa;
  border-radius: 4px;
  transition: all 0.3s;
}

.login-btn:hover {
  background: rgba(0, 212, 170, 0.1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.language-switch {
  cursor: pointer;
}

.language-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8b949e;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 4px;
  transition: all 0.3s;
}

.language-btn:hover {
  color: #00d4aa;
  background: rgba(0, 212, 170, 0.1);
}

.main-content {
  padding-top: 64px;
  min-height: 100vh;
}

/* 安装按钮样式 */
.install-btn {
  background: linear-gradient(90deg, #00d4aa, #00a8e8) !important;
  border: none !important;
  color: #fff !important;
  font-size: 12px;
  padding: 6px 12px;
}

.install-btn:hover {
  opacity: 0.9;
}

/* 桌面端隐藏安装按钮 */
@media (min-width: 769px) {
  .mobile-install {
    display: none !important;
  }
}

/* 移动端客服按钮 */
.mobile-service-btn {
  display: none;
  padding: 6px 8px !important;
  font-size: 16px;
  color: #8b949e !important;
  background: transparent !important;
  border: none !important;
}

.mobile-service-btn:hover {
  color: #00d4aa !important;
  padding: 6px 8px;
  height: auto;
  margin: 0;
}

.mobile-service-btn:hover {
  color: #00d4aa !important;
  background: transparent !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .header {
    padding: env(safe-area-inset-top) 12px 0;
    height: calc(56px + env(safe-area-inset-top));
  }
  
  .desktop-nav {
    display: none;
  }
  
  /* 显示移动端客服按钮 */
  .mobile-service-btn {
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  /* 桌面端悬浮按钮在移动端隐藏 */
  :deep(.chat-button.desktop-only) {
    display: none !important;
  }
  
  /* 移动端语言切换按钮 */
  .header-actions .mobile-lang {
    display: flex !important;
  }
  
  .header-actions .mobile-lang .language-btn {
    padding: 6px 8px;
    font-size: 16px;
    display: flex;
    align-items: center;
  }
  
  .header-actions {
    gap: 4px;
    display: flex;
    align-items: center;
  }
  
  .install-btn {
    padding: 4px 8px !important;
    font-size: 11px !important;
  }
  
  .main-content {
    padding-top: calc(56px + env(safe-area-inset-top));
    padding-bottom: calc(80px + env(safe-area-inset-bottom));
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}

@media (min-width: 769px) {
  .mobile-nav {
    display: none !important;
  }
}
</style>