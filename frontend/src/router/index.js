import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { guest: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { guest: true }
  },
  {
    path: '/trade',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Trade',
        component: () => import('@/views/Trade.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'home',
        name: 'TradeHome',
        component: () => import('@/views/Home.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'assets',
        name: 'Assets',
        component: () => import('@/views/Assets.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'option',
        name: 'OptionTrading',
        component: () => import('@/views/OptionTrading.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'market',
        name: 'Market',
        component: () => import('@/views/Market.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'fund',
        name: 'Fund',
        component: () => import('@/views/Fund.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'kyc',
        name: 'Kyc',
        component: () => import('@/views/Kyc.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'security',
        name: 'Security',
        component: () => import('@/views/Security.vue'),
        meta: { requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const token = userStore.token
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && token) {
    // 已登录用户访问登录/注册页面，跳转到交易页
    next('/trade')
  } else {
    next()
  }
})

export default router