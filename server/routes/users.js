const express = require('express')
const bcrypt = require('bcryptjs')
const appStore = require('../services/appStore')
const { authRequired, permissionRequired } = require('../middleware/auth')
const { mapUser } = require('../services/rbac')

const router = express.Router()

async function fetchUsers() {
  const rows = await appStore.queryAll(`
    SELECT u.*, r.name AS role_name, r.code AS role_code
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY u.id ASC
  `)
  return rows.map(mapUser)
}

router.get('/', authRequired, permissionRequired('system:user:view'), async (req, res) => {
  try {
    res.json({ items: await fetchUsers() })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/', authRequired, permissionRequired('system:user:manage'), async (req, res) => {
  try {
    const { username, password, displayName = '', status = 'enabled', roleId } = req.body || {}

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' })
    }
    if (!roleId) {
      return res.status(400).json({ message: '请选择用户角色' })
    }

    const role = await appStore.queryOne('SELECT id FROM roles WHERE id = ?', [roleId])
    if (!role) {
      return res.status(400).json({ message: '角色不存在' })
    }

    const exists = await appStore.queryOne('SELECT id FROM users WHERE username = ?', [username])
    if (exists) {
      return res.status(400).json({ message: '用户名已存在' })
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const result = await appStore.execute(
      `INSERT INTO users (username, password_hash, display_name, status, role_id)
       VALUES (?, ?, ?, ?, ?)`,
      [username, passwordHash, displayName, status, roleId]
    )

    const row = await appStore.queryOne(`
      SELECT u.*, r.name AS role_name, r.code AS role_code
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
    `, [appStore.getLastInsertId(result)])

    res.status(201).json({ item: mapUser(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/:id', authRequired, permissionRequired('system:user:manage'), async (req, res) => {
  try {
    const existing = await appStore.queryOne('SELECT * FROM users WHERE id = ?', [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '用户不存在' })
    }

    const { displayName, status, roleId, password } = req.body || {}
    const nextRoleId = roleId ?? existing.role_id
    const nextStatus = status ?? existing.status
    const nextDisplayName = displayName ?? existing.display_name
    const now = appStore.currentTimestamp()

    if (nextRoleId) {
      const role = await appStore.queryOne('SELECT id FROM roles WHERE id = ?', [nextRoleId])
      if (!role) {
        return res.status(400).json({ message: '角色不存在' })
      }
    }

    if (existing.username === 'admin' && nextStatus === 'disabled') {
      return res.status(400).json({ message: '不能禁用默认管理员账号' })
    }

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10)
      await appStore.execute(
        `UPDATE users
         SET display_name = ?, status = ?, role_id = ?, password_hash = ?, updated_at = ?
         WHERE id = ?`,
        [nextDisplayName, nextStatus, nextRoleId, passwordHash, now, req.params.id]
      )
    } else {
      await appStore.execute(
        `UPDATE users
         SET display_name = ?, status = ?, role_id = ?, updated_at = ?
         WHERE id = ?`,
        [nextDisplayName, nextStatus, nextRoleId, now, req.params.id]
      )
    }

    const row = await appStore.queryOne(`
      SELECT u.*, r.name AS role_name, r.code AS role_code
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
    `, [req.params.id])

    res.json({ item: mapUser(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', authRequired, permissionRequired('system:user:manage'), async (req, res) => {
  try {
    const existing = await appStore.queryOne('SELECT * FROM users WHERE id = ?', [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '用户不存在' })
    }

    if (existing.username === 'admin') {
      return res.status(400).json({ message: '不能删除默认管理员账号' })
    }

    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: '不能删除当前登录用户' })
    }

    await appStore.execute('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
