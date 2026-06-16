import axios from 'axios'
import request from './request'
import { getToken } from '@/utils/auth'

export function fetchLiveOverviewStats(params) {
  return request.get('/live-overview/stats', { params })
}

export function fetchOrgLiveOverviewStats(params) {
  return request.get('/live-overview/org-stats', { params })
}

export function fetchOrderStatuses() {
  return request.get('/live-overview/order-statuses')
}

export function fetchLiveOverviewOrders(params) {
  return request.get('/live-overview/orders', { params })
}

export function fetchLiveOverviewProductChart(params) {
  return request.get('/live-overview/product-chart', { params })
}

export function fetchProductCommissionChart(params) {
  return request.get('/live-overview/product-commission-chart', { params })
}

export function fetchAdUserAmountChart(params) {
  return request.get('/live-overview/ad-user-amount-chart', { params })
}

export function fetchSellerAmountChart(params) {
  return request.get('/live-overview/seller-amount-chart', { params })
}

export function fetchHourlyAmountChart(params) {
  return request.get('/live-overview/hourly-amount-chart', { params })
}

export function fetchDailyAmountChart(params) {
  return request.get('/live-overview/daily-amount-chart', { params })
}

function parseExportFilename(contentDisposition, fallbackName) {
  if (!contentDisposition) return fallbackName

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] || fallbackName
}

async function downloadExport(url, params, fallbackName) {
  try {
    const response = await axios.get(url, {
      params,
      responseType: 'blob',
      timeout: 300000,
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    })

    const contentType = response.headers['content-type'] || ''
    if (contentType.includes('application/json')) {
      const text = await response.data.text()
      const payload = JSON.parse(text)
      throw new Error(payload.message || '导出失败')
    }

    return {
      blob: response.data,
      filename: parseExportFilename(response.headers['content-disposition'], fallbackName)
    }
  } catch (error) {
    const data = error.response?.data
    if (data instanceof Blob) {
      const text = await data.text()
      try {
        const payload = JSON.parse(text)
        throw new Error(payload.message || '导出失败')
      } catch (parseError) {
        throw new Error('导出失败')
      }
    }
    throw new Error(error.message || '导出失败')
  }
}

export async function downloadLiveOverviewExport(params) {
  const fallbackName = params.startDate === params.endDate
    ? `直播订单_${params.startDate}.xlsx`
    : `直播订单_${params.startDate}_${params.endDate}.xlsx`

  return downloadExport('/api/live-overview/export', params, fallbackName)
}

export async function downloadOrgLiveOverviewExport(params) {
  const orgLabel = params.orgName ? `${params.orgName}_` : ''
  const fallbackName = params.startDate === params.endDate
    ? `直播订单_${orgLabel}${params.startDate}.xlsx`
    : `直播订单_${orgLabel}${params.startDate}_${params.endDate}.xlsx`

  return downloadExport('/api/live-overview/org-export', params, fallbackName)
}
