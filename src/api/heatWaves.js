import request from './request'

export function fetchHeatWaves(params) {
  return request.get('/heat-waves', { params })
}

export function fetchHeatWave(id) {
  return request.get(`/heat-waves/${id}`)
}

export function createHeatWave(data) {
  return request.post('/heat-waves', data)
}

export function updateHeatWave(id, data) {
  return request.put(`/heat-waves/${id}`, data)
}

export function deleteHeatWave(id) {
  return request.delete(`/heat-waves/${id}`)
}
