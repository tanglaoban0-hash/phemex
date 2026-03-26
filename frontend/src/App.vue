<template>
  <div class="app-container">
    <router-view />
    <MobileNav />
  </div>
</template>

<script setup>
import MobileNav from './components/MobileNav.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #0d1117;
  color: #fff;
}

#app {
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
  padding-bottom: 56px;
}
</style>
