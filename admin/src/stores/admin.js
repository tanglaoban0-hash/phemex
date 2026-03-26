import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

// 检查token是否过期
const isTokenExpired = (token) => {
  if (!token) return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = parts[1] + '='.repeat((4 - parts[1].length % 4) % 4)
    const decoded = JSON.parse(atob(payload))
    return decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

// 获取存储的token，如果过期则清除
const getStoredToken = () => {
  const stored = localStorage.getItem('admin_token')
  if (isTokenExpired(stored)) {
    localStorage.removeItem('admin_token')
    return ''
  }
  return stored
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref(getStoredToken())
  const adminInfo = ref(null)

  const setToken = (newToken) => {
    token.value = newToken
    localStorage.setItem('admin_token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const clearToken = () => {
    token.value = ''
    adminInfo.value = null
    localStorage.removeItem('admin_token')
    delete api.defaults.headers.common['Authorization']
  }

  const login = async (credentials) => {
    const res = await api.post('/admin/login', credentials)
    if (res.data.code === 200) {
      setToken(res.data.data.token)
      adminInfo.value = res.data.data.admin
    }
    return res.data
  }

  const logout = () => {
    clearToken()
  }

  return {
    token,
    adminInfo,
    setToken,
    clearToken,
    login,
    logout
  }
})