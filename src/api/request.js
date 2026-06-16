import axios from 'axios'
import { getToken, clearAuth } from '@/utils/auth'
import router from '@/router'
import { Message } from 'element-ui'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000
})

request.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  response => response.data,
  error => {
    const data = error.response?.data || {}
    const message = data.message || data.hint || error.message || '请求失败'
    if (error.response?.status === 401) {
      clearAuth()
      if (router.currentRoute.path !== '/login') {
        Message.warning('登录已过期，请重新登录')
        router.replace({ path: '/login', query: { redirect: router.currentRoute.fullPath } })
      }
    } else if (error.response?.status === 403) {
      Message.warning(message)
    }
    return Promise.reject(new Error(message))
  }
)

export default request
