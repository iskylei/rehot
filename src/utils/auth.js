import Vue from 'vue'

const TOKEN_KEY = 'rehot_auth_token'
const USER_KEY = 'rehot_auth_user'
const PERMISSIONS_KEY = 'rehot_permissions'
const MENUS_KEY = 'rehot_menus'

function readStoredMenus() {
  const raw = localStorage.getItem(MENUS_KEY)
  if (!raw) return []
  try {
    const menus = JSON.parse(raw)
    const serialized = JSON.stringify(menus)
    if (serialized.includes('/admin/heat-waves')) {
      localStorage.removeItem(MENUS_KEY)
      return []
    }
    return menus
  } catch (error) {
    return []
  }
}

export const authState = Vue.observable({
  loggedIn: !!localStorage.getItem(TOKEN_KEY),
  permissions: JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || '[]'),
  menus: readStoredMenus()
})

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token, user, permissions = [], menus = []) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions))
  localStorage.setItem(MENUS_KEY, JSON.stringify(menus))
  authState.loggedIn = true
  authState.permissions = permissions
  authState.menus = menus
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

export function getPermissions() {
  return authState.permissions
}

export function getMenus() {
  return authState.menus
}

export function hasPermission(code) {
  return authState.permissions.includes(code)
}

export function hasAnyPermission(codes = []) {
  return codes.some(code => authState.permissions.includes(code))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(PERMISSIONS_KEY)
  localStorage.removeItem(MENUS_KEY)
  authState.loggedIn = false
  authState.permissions = []
  authState.menus = []
}

export function isLoggedIn() {
  return authState.loggedIn
}
