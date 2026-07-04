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

export function batchDeleteTbOrders(ids) {
  return request.post('/tb-orders/batch-delete', { ids })
}

export function importTbOrders(items) {
  return request.post('/tb-orders/import', { items })
}

export async function importTbOrdersExcel(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await axios.post('/api/tb-orders/import/excel', formData, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'multipart/form-data'
    },
    timeout: 300000
  })
  return response.data
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

export async function downloadTbOrderExcelTemplate() {
  const response = await axios.get('/api/tb-orders/import/excel-template', {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  })
  return response.data
}
