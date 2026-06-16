const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const appStore = require('../services/appStore')
const { JWT_SECRET, authRequired } = require('../middleware/auth')
const {
  getUserWithRole,
  getUserPermissions,
  getAccessibleMenus,
  mapUser
} = require('../services/rbac')

const router = express.Router()

async function buildAuthPayload(userRow) {
  const user = mapUser(userRow)
  return {
    user,
    permissions: await getUserPermissions(user.id),
    menus: await getAccessibleMenus(user.id)
  }
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}

    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' })
    }

    const row = await appStore.queryOne('SELECT * FROM users WHERE username = ?', [username])
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    if (row.status === 'disabled') {
      return res.status(403).json({ message: '账号已禁用，请联系管理员' })
    }

    const userWithRole = await getUserWithRole(row.id)
    const token = jwt.sign(
      { id: row.id, username: row.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const payload = await buildAuthPayload(userWithRole)
    res.json({
      token,
      ...payload
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/me', authRequired, async (req, res) => {
  try {
    const userWithRole = await getUserWithRole(req.user.id)
    if (!userWithRole) {
      return res.status(404).json({ message: '用户不存在' })
    }
    if (userWithRole.status === 'disabled') {
      return res.status(403).json({ message: '账号已禁用' })
    }
    res.json(await buildAuthPayload(userWithRole))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/change-password', authRequired, async (req, res) => {
  try {
    const { oldPassword = '', newPassword = '' } = req.body || {}

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '请输入原密码和新密码' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度不能少于 6 位' })
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ message: '新密码不能与原密码相同' })
    }

    const row = await appStore.queryOne('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!row) {
      return res.status(404).json({ message: '用户不存在' })
    }
    if (row.status === 'disabled') {
      return res.status(403).json({ message: '账号已禁用' })
    }
    if (!bcrypt.compareSync(oldPassword, row.password_hash)) {
      return res.status(400).json({ message: '原密码不正确' })
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10)
    const now = appStore.currentTimestamp()
    await appStore.execute(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [passwordHash, now, req.user.id]
    )

    res.json({ ok: true, message: '密码修改成功' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
