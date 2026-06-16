const express = require('express')
const { mapSysTbOrder } = require('../db')
const { authRequired, permissionRequired } = require('../middleware/auth')
const orderStore = require('../services/orderStore')
const {
  CSV_TEMPLATE_HEADERS,
  normalizePayload,
  payloadToDbRow,
  buildUpdateSets,
  CAMEL_TO_DB
} = require('../constants/tbOrderFields')

const router = express.Router()

router.use(authRequired, permissionRequired('tb_order:view'))

function validateOrder(payload, isUpdate = false) {
  const errors = []
  if (!isUpdate && !payload.bizOrderId) {
    errors.push('淘宝子编号不能为空')
  }
  if (payload.buyAmount !== undefined && payload.buyAmount !== null && payload.buyAmount !== '') {
    if (Number.isNaN(Number(payload.buyAmount))) {
      errors.push('购买数量必须为数字')
    }
  }
  return errors
}

router.get('/import/template', (req, res) => {
  const headerLine = CSV_TEMPLATE_HEADERS.join(',')
  const sample = [
    'TB202606120001',
    'TB202606120000',
    '服务商A',
    '示例商品',
    'ITEM001',
    '达人小王',
    '机构甲',
    '订单已支付',
    '2026-06-12 10:00:00',
    '199.00',
    '19.90',
    '199.00',
    '10%',
    '示例备注',
    '0',
    '199.00',
    '1',
    '机构甲',
    '自然流量'
  ].join(',')
  const csv = `\uFEFF${headerLine}\n${sample}\n`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="tb_order_import_template.csv"')
  res.send(csv)
})

router.get('/', async (req, res) => {
  try {
    const {
      keyword = '',
      orderStatus = '',
      startDate = '',
      endDate = '',
      page = '1',
      pageSize = '20'
    } = req.query

    const pageNum = Math.max(1, Number(page) || 1)
    const sizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20))
    const offset = (pageNum - 1) * sizeNum
    const table = orderStore.getOrdersTableRef()

    let where = 'WHERE 1=1'
    const params = []

    if (keyword) {
      where += ` AND (
        biz_order_id LIKE ? OR parent_order_id LIKE ? OR item_title LIKE ?
        OR seller_nick LIKE ? OR ad_user_nick LIKE ? OR agency_nick LIKE ?
        OR login_user_name LIKE ?
      )`
      const like = `%${keyword}%`
      params.push(like, like, like, like, like, like, like)
    }

    if (orderStatus) {
      where += ' AND order_status = ?'
      params.push(orderStatus)
    }

    if (startDate) {
      where += ' AND order_paid_time >= ?'
      params.push(startDate)
    }

    if (endDate) {
      where += ' AND order_paid_time <= ?'
      params.push(endDate.includes(':') ? endDate : `${endDate} 23:59:59`)
    }

    const totalRow = await orderStore.queryOne(`SELECT COUNT(*) AS count FROM ${table} ${where}`, params)
    const rows = await orderStore.queryAll(`
      SELECT * FROM ${table}
      ${where}
      ORDER BY order_paid_time DESC, id DESC
      LIMIT ? OFFSET ?
    `, [...params, sizeNum, offset])

    res.json({
      items: rows.map(mapSysTbOrder),
      total: Number(totalRow?.count) || 0,
      page: pageNum,
      pageSize: sizeNum
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (req.params.id === 'import') return res.status(404).json({ message: '记录不存在' })
    const table = orderStore.getOrdersTableRef()
    const row = await orderStore.queryOne(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id])
    if (!row) {
      return res.status(404).json({ message: '订单不存在' })
    }
    res.json({ item: mapSysTbOrder(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/import', permissionRequired('tb_order:manage'), async (req, res) => {
  try {
    const { items = [] } = req.body || {}
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '导入数据不能为空' })
    }

    const operator = req.user?.username || ''
    const table = orderStore.getOrdersTableRef()
    let success = 0
    let skipped = 0
    const errors = []

    const importRows = async () => {
      for (let index = 0; index < items.length; index += 1) {
        const raw = items[index]
        const payload = normalizePayload(raw)
        const rowErrors = validateOrder(payload)
        if (rowErrors.length) {
          errors.push({ row: index + 1, message: rowErrors.join('；') })
          continue
        }

        const existing = await orderStore.queryOne(
          `SELECT id FROM ${table} WHERE biz_order_id = ?`,
          [payload.bizOrderId]
        )
        if (existing) {
          skipped += 1
          continue
        }

        try {
          const dbRow = payloadToDbRow(payload, operator)
          const columns = Object.keys(dbRow)
          const placeholders = columns.map(() => '?').join(', ')
          await orderStore.execute(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            columns.map(col => dbRow[col])
          )
          success += 1
        } catch (error) {
          errors.push({ row: index + 1, message: error.message })
        }
      }
    }

    await importRows()

    res.json({
      total: items.length,
      success,
      skipped,
      failed: errors.length,
      errors: errors.slice(0, 20)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/', permissionRequired('tb_order:manage'), async (req, res) => {
  try {
    const payload = normalizePayload(req.body || {})
    const errors = validateOrder(payload)
    if (errors.length) {
      return res.status(400).json({ message: errors.join('；') })
    }

    const table = orderStore.getOrdersTableRef()
    const exists = await orderStore.queryOne(
      `SELECT id FROM ${table} WHERE biz_order_id = ?`,
      [payload.bizOrderId]
    )
    if (exists) {
      return res.status(400).json({ message: '淘宝子编号已存在' })
    }

    const dbRow = payloadToDbRow(payload, req.user?.username || '')
    const columns = Object.keys(dbRow)
    const placeholders = columns.map(() => '?').join(', ')
    const result = await orderStore.execute(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      columns.map(col => dbRow[col])
    )

    const row = await orderStore.queryOne(
      `SELECT * FROM ${table} WHERE id = ?`,
      [orderStore.getLastInsertId(result)]
    )
    res.status(201).json({ item: mapSysTbOrder(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/:id', permissionRequired('tb_order:manage'), async (req, res) => {
  try {
    const table = orderStore.getOrdersTableRef()
    const existing = await orderStore.queryOne(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '订单不存在' })
    }

    const payload = normalizePayload(req.body || {})
    const errors = validateOrder(payload, true)
    if (errors.length) {
      return res.status(400).json({ message: errors.join('；') })
    }

    if (payload.bizOrderId && payload.bizOrderId !== existing.biz_order_id) {
      const dup = await orderStore.queryOne(
        `SELECT id FROM ${table} WHERE biz_order_id = ? AND id != ?`,
        [payload.bizOrderId, req.params.id]
      )
      if (dup) {
        return res.status(400).json({ message: '淘宝子编号已存在' })
      }
    }

    const merged = {}
    Object.keys(CAMEL_TO_DB).forEach(camel => {
      const dbCol = CAMEL_TO_DB[camel]
      const fromPayload = payload[camel]
      if (fromPayload !== undefined) {
        merged[camel] = fromPayload
        return
      }
      if (camel === 'buyAmount') {
        merged[camel] = existing[dbCol]
        return
      }
      const existingVal = existing[dbCol]
      merged[camel] = camel === 'bizOrderId'
        ? existing.biz_order_id
        : (existingVal ?? '')
    })

    const { sets, values } = buildUpdateSets(merged, req.user?.username || '')
    await orderStore.execute(
      `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`,
      [...values, req.params.id]
    )

    const row = await orderStore.queryOne(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id])
    res.json({ item: mapSysTbOrder(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', permissionRequired('tb_order:manage'), async (req, res) => {
  try {
    const table = orderStore.getOrdersTableRef()
    const existing = await orderStore.queryOne(`SELECT id FROM ${table} WHERE id = ?`, [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '订单不存在' })
    }

    await orderStore.execute(`DELETE FROM ${table} WHERE id = ?`, [req.params.id])
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
