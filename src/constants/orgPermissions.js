export const ORG_PERMISSION_PREFIX = 'org:view:'

export function buildOrgPermissionCode(orgName) {
  return `${ORG_PERMISSION_PREFIX}${String(orgName || '').trim()}`
}

export function parseOrgNameFromPermissionCode(code) {
  if (!code || !String(code).startsWith(ORG_PERMISSION_PREFIX)) return ''
  return String(code).slice(ORG_PERMISSION_PREFIX.length).trim()
}

export function isOrgPermissionCode(code) {
  return String(code || '').startsWith(ORG_PERMISSION_PREFIX)
}

export function parseOrgFromMenuPath(path) {
  const raw = String(path || '')
  const queryIndex = raw.indexOf('?')
  if (queryIndex === -1) return ''

  const pathname = raw.slice(0, queryIndex)
  if (pathname !== '/admin/org-overview') return ''

  const params = new URLSearchParams(raw.slice(queryIndex + 1))
  return String(params.get('org') || '').trim()
}

export function canViewMenuPermission(permissionCode, permissions = []) {
  const permissionSet = new Set(permissions)
  if (!permissionCode) return true
  if (permissionSet.has(permissionCode)) return true
  if (isOrgPermissionCode(permissionCode) && permissionSet.has('tb_order:view')) {
    return true
  }
  return false
}

export function canAccessOrgData(orgName, permissions = []) {
  const org = String(orgName || '').trim()
  const permissionSet = new Set(permissions)

  if (permissionSet.has('tb_order:view')) return true
  if (org && permissionSet.has(buildOrgPermissionCode(org))) return true
  return false
}
