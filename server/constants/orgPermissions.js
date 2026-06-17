const ORG_PERMISSION_PREFIX = 'org:view:'

const DEFAULT_ORG_OVERVIEWS = [
  { org: '联奇文化', title: '联奇文化数据', sortOrder: 3 },
  { org: '柳风文化', title: '柳风文化数据', sortOrder: 4 }
]

function buildOrgPermissionCode(orgName) {
  return `${ORG_PERMISSION_PREFIX}${String(orgName || '').trim()}`
}

function buildOrgPermissionMeta(orgName) {
  const org = String(orgName || '').trim()
  return {
    org,
    code: buildOrgPermissionCode(org),
    name: `查看${org}数据`,
    description: `仅可查看「${org}」机构数据总览`
  }
}

function parseOrgNameFromPermissionCode(code) {
  if (!code || !String(code).startsWith(ORG_PERMISSION_PREFIX)) return ''
  return String(code).slice(ORG_PERMISSION_PREFIX.length).trim()
}

function isOrgPermissionCode(code) {
  return String(code || '').startsWith(ORG_PERMISSION_PREFIX)
}

function parseOrgFromMenuPath(path) {
  const raw = String(path || '')
  const queryIndex = raw.indexOf('?')
  if (queryIndex === -1) return ''

  const pathname = raw.slice(0, queryIndex)
  if (pathname !== '/admin/org-overview') return ''

  const params = new URLSearchParams(raw.slice(queryIndex + 1))
  return String(params.get('org') || '').trim()
}

function buildOrgOverviewMenuPath(orgName) {
  const org = String(orgName || '').trim()
  return org ? `/admin/org-overview?org=${encodeURIComponent(org)}` : '/admin/org-overview'
}

module.exports = {
  ORG_PERMISSION_PREFIX,
  DEFAULT_ORG_OVERVIEWS,
  buildOrgPermissionCode,
  buildOrgPermissionMeta,
  parseOrgNameFromPermissionCode,
  isOrgPermissionCode,
  parseOrgFromMenuPath,
  buildOrgOverviewMenuPath
}
