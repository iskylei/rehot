import request from './request'

export function fetchMenus() {
  return request.get('/menus')
}

export function fetchMenusFlat() {
  return request.get('/menus/flat')
}

export function createMenu(data) {
  return request.post('/menus', data)
}

export function updateMenu(id, data) {
  return request.put(`/menus/${id}`, data)
}

export function deleteMenu(id) {
  return request.delete(`/menus/${id}`)
}
