import axios from 'axios'
import request from './request'
import { getToken } from '@/utils/auth'

export function fetchLoginConfig() {
  return request.get('/login-config')
}

export function fetchLoginConfigAdmin() {
  return request.get('/login-config/admin')
}

export function updateLoginConfig(data) {
  return request.put('/login-config', data)
}

export function uploadLoginBackground(file) {
  const formData = new FormData()
  formData.append('file', file)
  return axios.post('/api/login-config/upload', formData, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'multipart/form-data'
    }
  }).then(res => res.data)
}

export function clearLoginBackground() {
  return request.delete('/login-config/background-image')
}

export function resetLoginConfig() {
  return request.post('/login-config/reset')
}
