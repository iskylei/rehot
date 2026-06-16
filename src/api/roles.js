import request from './request'

export function fetchRoles() {
  return request.get('/roles')
}

export function fetchPermissions() {
  return request.get('/roles/permissions/all')
}

export function createRole(data) {
  return request.post('/roles', data)
}

export function updateRole(id, data) {
  return request.put(`/roles/${id}`, data)
}

export function deleteRole(id) {
  return request.delete(`/roles/${id}`)
}
