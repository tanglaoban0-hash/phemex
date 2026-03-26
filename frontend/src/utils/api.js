import axios from 'axios'
import { ElMessage } from 'element-plus'
import Cookies from 'js-cookie'

// 根据环境自动判断API地址
const getBaseURL = () => {
  // 开发环境使用当前host
  if (import.meta.env.DEV) {
    return '/api'
  }
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { code, message } = response.data
    if (code !== 200) {
      ElMessage.error(message || '请求失败')
      if (code === 401) {
        Cookies.remove('token')
        window.location.href = '/login'
      }
      return Promise.reject(response.data)
    }
    return response
  },
  (error) => {
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
  }
)

export default api