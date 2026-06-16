const express = require('express')
const appStore = require('../services/appStore')
const { authRequired, permissionRequired } = require('../middleware/auth')
const { mapMenu, buildMenuTree } = require('../services/rbac')

const router = express.Router()

router.get('/', authRequired, permissionRequired('system:menu:view'), async (req, res) => {
  try {
    const rows = await appStore.queryAll('SELECT * FROM menus ORDER BY sort_order ASC, id ASC')
    const items = buildMenuTree(rows.map(mapMenu))
    res.json({ items })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/flat', authRequired, permissionRequired('system:menu:view'), async (req, res) => {
  try {
    const rows = await appStore.queryAll('SELECT * FROM menus ORDER BY sort_order ASC, id ASC')
    res.json({ items: rows.map(mapMenu) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/', authRequired, permissionRequired('system:menu:manage'), async (req, res) => {
  try {
    const {
      parentId = 0,
      title,
      path = '',
      icon = '',
      permissionCode = '',
      sortOrder = 0,
      enabled = true
    } = req.body || {}

    if (!title) {
      return res.status(400).json({ message: '菜单标题不能为空' })
    }

    const result = await appStore.execute(
      `INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [parentId, title, path, icon, permissionCode, sortOrder, enabled ? 1 : 0]
    )

    const row = await appStore.queryOne('SELECT * FROM menus WHERE id = ?', [appStore.getLastInsertId(result)])
    res.status(201).json({ item: mapMenu(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/:id', authRequired, permissionRequired('system:menu:manage'), async (req, res) => {
  try {
    const existing = await appStore.queryOne('SELECT * FROM menus WHERE id = ?', [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '菜单不存在' })
    }

    const {
      parentId,
      title,
      path,
      icon,
      permissionCode,
      sortOrder,
      enabled
    } = req.body || {}

    const nextParentId = parentId ?? existing.parent_id
    if (Number(nextParentId) === Number(req.params.id)) {
      return res.status(400).json({ message: '上级菜单不能选择自身' })
    }

    const now = appStore.currentTimestamp()
    await appStore.execute(
      `UPDATE menus
       SET parent_id = ?, title = ?, path = ?, icon = ?, permission_code = ?,
           sort_order = ?, enabled = ?, updated_at = ?
       WHERE id = ?`,
      [
        nextParentId,
        title ?? existing.title,
        path ?? existing.path,
        icon ?? existing.icon,
        permissionCode ?? existing.permission_code,
        sortOrder ?? existing.sort_order,
        enabled === undefined ? existing.enabled : (enabled ? 1 : 0),
        now,
        req.params.id
      ]
    )

    const row = await appStore.queryOne('SELECT * FROM menus WHERE id = ?', [req.params.id])
    res.json({ item: mapMenu(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', authRequired, permissionRequired('system:menu:manage'), async (req, res) => {
  try {
    const existing = await appStore.queryOne('SELECT * FROM menus WHERE id = ?', [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '菜单不存在' })
    }

    const childCountRow = await appStore.queryOne(
      'SELECT COUNT(*) AS count FROM menus WHERE parent_id = ?',
      [req.params.id]
    )
    if (Number(childCountRow?.count) > 0) {
      return res.status(400).json({ message: '请先删除子菜单' })
    }

    await appStore.execute('DELETE FROM menus WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
