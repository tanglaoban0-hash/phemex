import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'
import Cookies from 'js-cookie'

export const useUserStore = defineStore('user', () => {
  const token = ref(Cookies.get('token') || '')
  const userInfo = ref(null)
  const balances = ref([])

  const isLogin = computed(() => !!token.value)

  const setToken = (newToken) => {
    token.value = newToken
    Cookies.set('token', newToken, { expires: 7 })
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const clearToken = () => {
    token.value = ''
    userInfo.value = null
    Cookies.remove('token')
    delete api.defaults.headers.common['Authorization']
  }

  const fetchUserInfo = async () => {
    try {
      const res = await api.get('/user/info')
      if (res.data.code === 200) {
        userInfo.value = res.data.data
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  }

  const fetchBalances = async () => {
    try {
      const res = await api.get('/asset/balances')
      if (res.data.code === 200) {
        balances.value = res.data.data
      }
    } catch (err) {
      console.error('获取余额失败:', err)
    }
  }

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials)
    if (res.data.code === 200) {
      setToken(res.data.data.token)
      await fetchUserInfo()
      await fetchBalances()
    }
    return res.data
  }

  const logout = () => {
    clearToken()
  }

  return {
    token,
    userInfo,
    balances,
    isLogin,
    setToken,
    clearToken,
    fetchUserInfo,
    fetchBalances,
    login,
    logout
  }
})