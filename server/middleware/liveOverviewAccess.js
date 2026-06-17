const { assertLiveOverviewAccess, resolveOrgNameFromQuery } = require('../services/orgPermissionService')

function liveOverviewAccessRequired(options = {}) {
  const { scope = 'query' } = options

  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: '未登录或登录已过期' })
      }

      const orgName = await resolveOrgNameFromQuery(req.query)
      const allowed = await assertLiveOverviewAccess(req.user.id, { scope, orgName })

      if (!allowed) {
        return res.status(403).json({ message: '无操作权限' })
      }

      next()
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }
}

module.exports = {
  liveOverviewAccessRequired
}
