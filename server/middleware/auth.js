const jwt = require('jsonwebtoken')
const appStore = require('../services/appStore')
const { hasAnyPermission } = require('../services/rbac')

const JWT_SECRET = process.env.JWT_SECRET || 'rehot-dev-secret'

function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token) {
    return res.status(401).json({ message: '未登录或登录已过期' })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch (error) {
    return res.status(401).json({ message: '未登录或登录已过期' })
  }
}

function permissionRequired(...codes) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: '未登录或登录已过期' })
      }

      const user = await appStore.queryOne('SELECT status FROM users WHERE id = ?', [req.user.id])
      if (!user || user.status !== 'enabled') {
        return res.status(403).json({ message: '账号已禁用' })
      }

      const allowed = await hasAnyPermission(req.user.id, codes)
      if (!allowed) {
        return res.status(403).json({ message: '无操作权限' })
      }

      next()
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }
}

module.exports = { authRequired, permissionRequired, JWT_SECRET }
