import axios from 'axios'
import request from './request'
import { getToken } from '@/utils/auth'

export function fetchTbOrders(params) {
  return request.get('/tb-orders', { params })
}

export function fetchTbOrder(id) {
  return request.get(`/tb-orders/${id}`)
}

export function createTbOrder(data) {
  return request.post('/tb-orders', data)
}

export function updateTbOrder(id, data) {
  return request.put(`/tb-orders/${id}`, data)
}

export function deleteTbOrder(id) {
  return request.delete(`/tb-orders/${id}`)
}

export function importTbOrders(items) {
  return request.post('/tb-orders/import', { items })
}

export async function downloadTbOrderTemplate() {
  const response = await axios.get('/api/tb-orders/import/template', {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  })
  return response.data
}
