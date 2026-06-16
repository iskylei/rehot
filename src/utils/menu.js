export const VALID_ADMIN_PATHS = [
  '/admin/live-overview',
  '/admin/tb-orders',
  '/admin/users',
  '/admin/roles',
  '/admin/menus',
  '/admin/login-config'
]

const LEGACY_PATH_REDIRECTS = {
  '/admin/heat-waves': '/admin/live-overview'
}

export function normalizeAdminPath(path) {
  if (!path) return null
  if (LEGACY_PATH_REDIRECTS[path]) return LEGACY_PATH_REDIRECTS[path]
  if (VALID_ADMIN_PATHS.includes(path)) return path
  return null
}

export function findFirstMenuPath(menus = [], permissions = []) {
  const permissionSet = new Set(permissions)

  const canAccess = menu => {
    if (!menu.permissionCode) return true
    return permissionSet.has(menu.permissionCode)
  }

  for (const menu of menus) {
    const normalized = normalizeAdminPath(menu.path)
    if (normalized && canAccess(menu)) {
      return normalized
    }
    if (menu.children?.length) {
      const childPath = findFirstMenuPath(menu.children, permissions)
      if (childPath) return childPath
    }
  }

  return VALID_ADMIN_PATHS[0]
}

export function canAccessPath(path, menus = [], permissions = []) {
  const normalized = normalizeAdminPath(path)
  if (!normalized) return false

  const permissionSet = new Set(permissions)
  let matched = false

  const walk = items => {
    items.forEach(menu => {
      const menuPath = normalizeAdminPath(menu.path)
      if (menuPath === normalized) {
        matched = !menu.permissionCode || permissionSet.has(menu.permissionCode)
      }
      if (menu.children?.length) walk(menu.children)
    })
  }

  walk(menus)

  if (!matched && normalized === '/admin/live-overview') {
    return permissionSet.has('tb_order:view')
  }

  return matched
}

export function getRoutePermission(to) {
  const record = [...to.matched].reverse().find(item => item.meta.permission)
  return record?.meta.permission || ''
}
