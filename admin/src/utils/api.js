import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    const { code, message } = response.data
    if (code !== 200) {
      ElMessage.error(message || '请求失败')
      if (code === 401) {
        localStorage.removeItem('admin_token')
        // 延迟跳转，让用户看到错误提示
        setTimeout(() => {
          window.location.href = '/login'
        }, 1500)
      }
      return Promise.reject(response.data)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('admin_token')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    } else {
      ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default api