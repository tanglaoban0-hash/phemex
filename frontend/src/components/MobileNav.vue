<template>
  <nav class="mobile-nav" v-if="showNav">
    <router-link to="/trade/home" :class="{ active: isActive('/trade/home') }">
      <span class="icon">🏠</span>
      <span class="text">{{ $t('nav.home') }}</span>
    </router-link>
    <router-link to="/trade/market" :class="{ active: isActive('/trade/market') }">
      <span class="icon">📈</span>
      <span class="text">{{ $t('nav.market') }}</span>
    </router-link>
    <router-link to="/trade/option" :class="{ active: isActive('/trade/option') }">
      <span class="icon">⚡</span>
      <span class="text">{{ $t('nav.options') }}</span>
    </router-link>
    <router-link to="/trade" :class="{ active: isActive('/trade') && !isActive('/trade/') && !isActive('/trade/option') && !isActive('/trade/market') && !isActive('/trade/assets') && !isActive('/trade/home') }">
      <span class="icon">📊</span>
      <span class="text">{{ $t('nav.trade') }}</span>
    </router-link>
    <router-link to="/trade/assets" :class="{ active: isActive('/trade/assets') }">
      <span class="icon">💰</span>
      <span class="text">{{ $t('nav.assets') }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showNav = ref(false)

const checkMobile = () => {
  if (typeof window !== 'undefined') {
    showNav.value = window.innerWidth <= 768
  }
}

const isActive = (path) => {
  return route.path === path || route.path.startsWith(path + '/')
}

onMounted(() => {
  checkMobile()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', checkMobile)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkMobile)
  }
})
</script>

<style scoped>
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #161b22;
  border-top: 1px solid #30363d;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 999;
}

.mobile-nav a {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8b949e;
  text-decoration: none;
  font-size: 9px;
  flex: 1;
  height: 100%;
  padding: 4px 2px;
  min-width: 0;
}

.mobile-nav a.active {
  color: #00d4aa;
}

.mobile-nav .icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.mobile-nav .text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
