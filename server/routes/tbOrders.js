const express = require('express')
const multer = require('multer')
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
const {
  buildExcelImportTemplateBuffer,
  parseExcelBuffer,
  importTbOrderItems
} = require('../services/tbOrderImport')

const router = express.Router()
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const name = String(file.originalname || '').toLowerCase()
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    if (allowedMime.includes(file.mimetype) || name.endsWith('.xlsx') || name.endsWith('.xls')) {
      cb(null, true)
      return
    }
    cb(new Error('仅支持上传 Excel 文件（.xlsx / .xls）'))
  }
})

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

router.get('/import/excel-template', (req, res) => {
  try {
    const buffer = buildExcelImportTemplateBuffer()
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      'attachment; filename*=UTF-8\'\'%E7%9B%B4%E6%92%AD%E8%AE%A2%E5%8D%95%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF.xlsx'
    )
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

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
    const sizeNum = Math.min(500, Math.max(1, Number(pageSize) || 20))
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

const DUPLICATE_GROUP_FIELDS = {
  bizOrderId: 'biz_order_id',
  parentOrderId: 'parent_order_id'
}

router.get('/duplicates', async (req, res) => {
  try {
    const {
      groupBy = 'bizOrderId',
      startDate = '',
      endDate = '',
      page = '1',
      pageSize = '20'
    } = req.query

    const groupColumn = DUPLICATE_GROUP_FIELDS[groupBy]
    if (!groupColumn) {
      return res.status(400).json({ message: '不支持的重复依据，请使用淘宝子编号或淘宝主编号' })
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const sizeNum = Math.min(500, Math.max(1, Number(pageSize) || 20))
    const offset = (pageNum - 1) * sizeNum
    const table = orderStore.getOrdersTableRef()
    const trimmed = orderStore.trimExpr(groupColumn)

    let where = `WHERE ${trimmed} != ''`
    const params = []

    if (startDate) {
      where += ' AND order_paid_time >= ?'
      params.push(startDate)
    }

    if (endDate) {
      where += ' AND order_paid_time <= ?'
      params.push(endDate.includes(':') ? endDate : `${endDate} 23:59:59`)
    }

    const summary = await orderStore.queryOne(`
      SELECT COUNT(*) AS groups, COALESCE(SUM(dup_count), 0) AS rows
      FROM (
        SELECT COUNT(*) AS dup_count
        FROM ${table}
        ${where}
        GROUP BY ${trimmed}
        HAVING COUNT(*) > 1
      ) duplicate_groups
    `, params)

    const groupRows = await orderStore.queryAll(`
      SELECT ${trimmed} AS dup_key, COUNT(*) AS dup_count
      FROM ${table}
      ${where}
      GROUP BY ${trimmed}
      HAVING COUNT(*) > 1
      ORDER BY dup_count DESC, ${trimmed} ASC
      LIMIT ? OFFSET ?
    `, [...params, sizeNum, offset])

    const keys = groupRows
      .map(row => row.dup_key)
      .filter(key => key !== undefined && key !== null && String(key).trim() !== '')
    let ordersByKey = {}

    if (keys.length) {
      const placeholders = keys.map(() => '?').join(', ')
      const orderRows = await orderStore.queryAll(`
        SELECT * FROM ${table}
        ${where}
        AND ${trimmed} IN (${placeholders})
        ORDER BY ${trimmed} ASC, id ASC
      `, [...params, ...keys])

      ordersByKey = orderRows.reduce((acc, row) => {
        const key = String(row[groupColumn] || '').trim()
        if (!acc[key]) acc[key] = []
        acc[key].push(mapSysTbOrder(row))
        return acc
      }, {})
    }

    res.json({
      groupBy,
      items: groupRows.map(row => ({
        key: row.dup_key,
        count: Number(row.dup_count) || 0,
        orders: ordersByKey[row.dup_key] || []
      })),
      total: Number(summary?.groups) || 0,
      totalRows: Number(summary?.rows) || 0,
      page: pageNum,
      pageSize: sizeNum
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (req.params.id === 'import' || req.params.id === 'duplicates') {
      return res.status(404).json({ message: '记录不存在' })
    }
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

router.post('/import/excel', permissionRequired('tb_order:manage'), (req, res, next) => {
  excelUpload.single('file')(req, res, err => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Excel 文件过大，请控制在 30MB 以内'
        : (err.message || '文件上传失败')
      return res.status(400).json({ message })
    }
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: '请上传 Excel 文件' })
    }

    const items = parseExcelBuffer(req.file.buffer)
    if (!items.length) {
      return res.status(400).json({ message: '未解析到有效数据，请检查 Excel 文件' })
    }

    const result = await importTbOrderItems(items, req.user?.username || '')
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/import', permissionRequired('tb_order:manage'), async (req, res) => {
  try {
    const { items = [] } = req.body || {}
    const result = await importTbOrderItems(items, req.user?.username || '')
    if (!items.length) {
      return res.status(400).json({ message: result.message || '导入数据不能为空' })
    }
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/batch-delete', permissionRequired('tb_order:manage'), async (req, res) => {
  try {
    const { ids = [] } = req.body || {}
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: '请选择要删除的订单' })
    }

    const normalizedIds = [...new Set(
      ids
        .map(id => Number(id))
        .filter(id => Number.isInteger(id) && id > 0)
    )]

    if (!normalizedIds.length) {
      return res.status(400).json({ message: '无效的订单 ID' })
    }

    if (normalizedIds.length > 500) {
      return res.status(400).json({ message: '单次最多删除 500 条订单' })
    }

    const table = orderStore.getOrdersTableRef()
    const placeholders = normalizedIds.map(() => '?').join(', ')
    const result = await orderStore.execute(
      `DELETE FROM ${table} WHERE id IN (${placeholders})`,
      normalizedIds
    )
    const deleted = Number(result?.changes ?? result?.affectedRows ?? 0)

    res.json({ ok: true, deleted })
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
