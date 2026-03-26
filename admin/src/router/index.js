import { createRouter, createWebHistory } from 'vue-router'
import { useAdminStore } from '@/stores/admin'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue')
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue')
      },
      {
        path: 'coins',
        name: 'Coins',
        component: () => import('@/views/Coins.vue')
      },
      {
        path: 'pairs',
        name: 'Pairs',
        component: () => import('@/views/Pairs.vue')
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue')
      },
      {
        path: 'withdrawals',
        name: 'Withdrawals',
        component: () => import('@/views/Withdrawals.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue')
      },
      {
        path: 'option',
        name: 'OptionControl',
        component: () => import('@/views/OptionControl.vue')
      },
      {
        path: 'fund',
        name: 'Fund',
        component: () => import('@/views/Fund.vue')
      },
      {
        path: 'kyc',
        name: 'Kyc',
        component: () => import('@/views/Kyc.vue')
      },
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/Chat.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const adminStore = useAdminStore()
  
  if (to.path !== '/login' && !adminStore.token) {
    next('/login')
  } else if (to.path === '/login' && adminStore.token) {
    next('/')
  } else {
    next()
  }
})

export default router