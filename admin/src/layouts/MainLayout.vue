<template>
  <div class="main-layout">
    <aside class="sidebar">
      <div class="logo">
        <img src="/phemex-full-logo.png" class="logo-full" alt="Phemex" />
      </div>
      <el-menu
        :default-active="$route.path"
        router
        class="admin-menu"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/">
          <el-icon><DataLine /></el-icon>
          <span>数据概览</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/coins">
          <el-icon><Coin /></el-icon>
          <span>币种管理</span>
        </el-menu-item>
        <el-menu-item index="/pairs">
          <el-icon><Switch /></el-icon>
          <span>交易对管理</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><Document /></el-icon>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/fund">
          <el-icon><Money /></el-icon>
          <span>资金管理</span>
        </el-menu-item>
        <el-menu-item index="/kyc">
          <el-icon><User /></el-icon>
          <span>KYC认证</span>
        </el-menu-item>
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <span>客服中心</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
        <el-menu-item index="/option">
          <el-icon><Timer /></el-icon>
          <span>秒合约控制</span>
        </el-menu-item>
      </el-menu>
    </aside>
    
    <div class="main-content">
      <header class="header">
        <div class="breadcrumb">
          {{ $route.name }}
        </div>
        <div class="user-info">
          <el-dropdown>
            <span class="username">
              {{ adminStore.adminInfo?.username || '管理员' }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { useAdminStore } from '@/stores/admin'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const adminStore = useAdminStore()
const router = useRouter()

const handleLogout = () => {
  adminStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: #001529;
  position: fixed;
  height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #002140;
}

.logo-full {
  height: 28px;
  width: auto;
  object-fit: contain;
}

.admin-menu {
  border-right: none;
}

.main-content {
  flex: 1;
  margin-left: 220px;
  display: flex;
  flex-direction: column;
}

.header {
  height: 64px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.breadcrumb {
  font-size: 16px;
  font-weight: 500;
}

.username {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.content {
  flex: 1;
  padding: 24px;
  background: #f0f2f5;
  overflow-y: auto;
}
</style>