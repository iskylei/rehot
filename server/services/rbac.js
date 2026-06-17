const appStore = require('./appStore')
const { isOrgPermissionCode } = require('../constants/orgPermissions')

async function getUserWithRole(userId) {
  return appStore.queryOne(`
    SELECT u.id, u.username, u.display_name, u.status, u.role_id,
           r.name AS role_name, r.code AS role_code
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
  `, [userId])
}

async function getUserPermissions(userId) {
  const user = await getUserWithRole(userId)
  if (!user || !user.role_id) return []

  if (user.role_code === 'admin') {
    const rows = await appStore.queryAll('SELECT code FROM permissions ORDER BY id')
    return rows.map(row => row.code)
  }

  const rows = await appStore.queryAll(`
    SELECT p.code
    FROM permissions p
    INNER JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role_id = ?
    ORDER BY p.id
  `, [user.role_id])
  return rows.map(row => row.code)
}

async function hasPermission(userId, code) {
  const permissions = await getUserPermissions(userId)
  return permissions.includes(code)
}

async function hasAnyPermission(userId, codes) {
  const permissions = await getUserPermissions(userId)
  return codes.some(code => permissions.includes(code))
}

function mapMenu(row) {
  if (!row) return null
  return {
    id: row.id,
    parentId: row.parent_id || 0,
    title: row.title,
    path: row.path || '',
    icon: row.icon || '',
    permissionCode: row.permission_code || '',
    sortOrder: row.sort_order,
    enabled: Number(row.enabled) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function buildMenuTree(items) {
  const map = new Map()
  const roots = []

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })

  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortNodes = nodes => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    nodes.forEach(node => {
      if (node.children.length) sortNodes(node.children)
    })
  }
  sortNodes(roots)
  return roots
}

function canViewMenu(menu, permissionSet) {
  if (!menu.permissionCode) return true
  if (permissionSet.has(menu.permissionCode)) return true
  if (isOrgPermissionCode(menu.permissionCode) && permissionSet.has('tb_order:view')) {
    return true
  }
  return false
}

async function getAccessibleMenus(userId) {
  const permissions = await getUserPermissions(userId)
  const permissionSet = new Set(permissions)

  const rows = await appStore.queryAll(`
    SELECT * FROM menus
    WHERE enabled = 1
    ORDER BY sort_order ASC, id ASC
  `)

  const allMenus = rows.map(mapMenu)
  const allowed = allMenus.filter(menu => canViewMenu(menu, permissionSet))
  const allowedIds = new Set(allowed.map(menu => menu.id))

  const includeAncestors = new Set(allowedIds)
  allMenus.forEach(menu => {
    if (allowedIds.has(menu.id) && menu.parentId) {
      includeAncestors.add(menu.parentId)
    }
  })

  const visibleMenus = allMenus.filter(menu => includeAncestors.has(menu.id))
  return buildMenuTree(visibleMenus)
}

function mapUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || '',
    status: row.status || 'enabled',
    roleId: row.role_id,
    roleName: row.role_name || '',
    roleCode: row.role_code || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapRole(row, permissionIds = []) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    permissionIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapPermission(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    createdAt: row.created_at
  }
}

module.exports = {
  getUserWithRole,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  getAccessibleMenus,
  buildMenuTree,
  mapUser,
  mapRole,
  mapPermission,
  mapMenu
}
