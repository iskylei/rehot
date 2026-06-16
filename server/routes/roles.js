const express = require('express')
const appStore = require('../services/appStore')
const { authRequired, permissionRequired } = require('../middleware/auth')
const { mapRole, mapPermission } = require('../services/rbac')

const router = express.Router()

async function fetchRoleWithPermissions(roleId) {
  const row = await appStore.queryOne('SELECT * FROM roles WHERE id = ?', [roleId])
  if (!row) return null
  const permissionRows = await appStore.queryAll(
    'SELECT permission_id FROM role_permissions WHERE role_id = ?',
    [roleId]
  )
  const permissionIds = permissionRows.map(item => item.permission_id)
  return mapRole(row, permissionIds)
}

router.get('/permissions/all', authRequired, permissionRequired('system:role:view'), async (req, res) => {
  try {
    const items = (await appStore.queryAll('SELECT * FROM permissions ORDER BY id ASC')).map(mapPermission)
    res.json({ items })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/', authRequired, permissionRequired('system:role:view'), async (req, res) => {
  try {
    const rows = await appStore.queryAll('SELECT * FROM roles ORDER BY id ASC')
    const items = []
    for (const row of rows) {
      const permissionRows = await appStore.queryAll(
        'SELECT permission_id FROM role_permissions WHERE role_id = ?',
        [row.id]
      )
      const permissionIds = permissionRows.map(item => item.permission_id)
      items.push(mapRole(row, permissionIds))
    }
    res.json({ items })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/', authRequired, permissionRequired('system:role:manage'), async (req, res) => {
  try {
    const { name, code, description = '', permissionIds = [] } = req.body || {}

    if (!name || !code) {
      return res.status(400).json({ message: '角色名称和编码不能为空' })
    }

    const exists = await appStore.queryOne('SELECT id FROM roles WHERE code = ?', [code])
    if (exists) {
      return res.status(400).json({ message: '角色编码已存在' })
    }

    const result = await appStore.execute(
      'INSERT INTO roles (name, code, description) VALUES (?, ?, ?)',
      [name, code, description]
    )
    const roleId = appStore.getLastInsertId(result)

    for (const permissionId of permissionIds) {
      await appStore.insertIgnore(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleId, permissionId]
      )
    }

    res.status(201).json({ item: await fetchRoleWithPermissions(roleId) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/:id', authRequired, permissionRequired('system:role:manage'), async (req, res) => {
  try {
    const existing = await appStore.queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '角色不存在' })
    }

    const { name, description, permissionIds } = req.body || {}
    const nextName = name ?? existing.name
    const nextDescription = description ?? existing.description
    const now = appStore.currentTimestamp()

    await appStore.execute(
      'UPDATE roles SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [nextName, nextDescription, now, req.params.id]
    )

    if (Array.isArray(permissionIds)) {
      await appStore.execute('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id])
      for (const permissionId of permissionIds) {
        await appStore.insertIgnore(
          'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [req.params.id, permissionId]
        )
      }
    }

    res.json({ item: await fetchRoleWithPermissions(req.params.id) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', authRequired, permissionRequired('system:role:manage'), async (req, res) => {
  try {
    const existing = await appStore.queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '角色不存在' })
    }

    if (['admin', 'operator', 'viewer'].includes(existing.code)) {
      return res.status(400).json({ message: '内置角色不能删除' })
    }

    const usedCountRow = await appStore.queryOne(
      'SELECT COUNT(*) AS count FROM users WHERE role_id = ?',
      [req.params.id]
    )
    if (Number(usedCountRow?.count) > 0) {
      return res.status(400).json({ message: '该角色下仍有用户，无法删除' })
    }

    await appStore.execute('DELETE FROM roles WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
