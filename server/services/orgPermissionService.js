const appStore = require('./appStore')
const {
  buildOrgPermissionMeta,
  parseOrgFromMenuPath,
  isOrgPermissionCode
} = require('../constants/orgPermissions')
const { getUserPermissions, hasPermission } = require('./rbac')

async function ensureOrgPermission(orgName, menuTitle = '') {
  const meta = buildOrgPermissionMeta(orgName)
  if (!meta.org) {
    return null
  }

  await appStore.insertIgnore(
    `INSERT OR IGNORE INTO permissions (name, code, description)
     VALUES (?, ?, ?)`,
    `INSERT IGNORE INTO permissions (name, code, description)
     VALUES (?, ?, ?)`,
    [meta.name, meta.code, meta.description]
  )

  const permission = await appStore.queryOne('SELECT * FROM permissions WHERE code = ?', [meta.code])
  if (!permission) return null

  const adminRole = await appStore.queryOne("SELECT id FROM roles WHERE code = 'admin'")
  if (adminRole) {
    await appStore.insertIgnore(
      'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [adminRole.id, permission.id]
    )
  }

  return {
    ...meta,
    id: permission.id,
    menuTitle: menuTitle || `${meta.org}数据`
  }
}

async function canAccessOrgData(userId, orgName) {
  const org = String(orgName || '').trim()
  if (!org) return false

  if (await hasPermission(userId, 'tb_order:view')) {
    return true
  }

  const meta = buildOrgPermissionMeta(org)
  return hasPermission(userId, meta.code)
}

async function resolveOrgNameFromQuery(query = {}) {
  return String(query.orgName || query.org || '').trim()
}

async function hasAnyOrgViewPermission(userId) {
  const permissions = await getUserPermissions(userId)
  return permissions.some(code => isOrgPermissionCode(code))
}

async function assertLiveOverviewAccess(userId, { scope = 'query', orgName = '' } = {}) {
  const scopedOrg = String(orgName || '').trim()

  if (scope === 'global') {
    return hasPermission(userId, 'tb_order:view')
  }

  if (scope === 'org-capable') {
    if (await hasPermission(userId, 'tb_order:view')) return true
    return hasAnyOrgViewPermission(userId)
  }

  if (scope === 'org') {
    if (!scopedOrg) return false
    return canAccessOrgData(userId, scopedOrg)
  }

  if (scopedOrg) {
    return canAccessOrgData(userId, scopedOrg)
  }

  return hasPermission(userId, 'tb_order:view')
}

async function syncOrgMenuPermission({ path = '', title = '', permissionCode = '' } = {}) {
  const org = parseOrgFromMenuPath(path)
  if (!org) {
    return permissionCode
  }

  const ensured = await ensureOrgPermission(org, title)
  if (!ensured) {
    return permissionCode
  }

  if (!permissionCode || permissionCode === 'tb_order:view') {
    return ensured.code
  }

  return permissionCode
}

module.exports = {
  ensureOrgPermission,
  canAccessOrgData,
  resolveOrgNameFromQuery,
  assertLiveOverviewAccess,
  syncOrgMenuPermission
}
