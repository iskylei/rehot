const XLSX = require('xlsx')
const orderStore = require('./orderStore')
const { parseExcelBuffer } = require('../utils/parseExcelSheet')
const {
  EXCEL_IMPORT_HEADERS,
  normalizePayload,
  payloadToDbRow
} = require('../constants/tbOrderFields')

const SAMPLE_ROW = [
  'TB202606120000',
  'TB202606120001',
  '服务商A',
  '示例商品',
  'ITEM001',
  '达人小王',
  '联奇文化',
  '订单已支付',
  '2026-05-13 09:00:00',
  '2026-05-13 10:56:00',
  '199.00',
  '0',
  '10%',
  '19.90'
]

function buildExcelImportTemplateBuffer() {
  const worksheet = XLSX.utils.aoa_to_sheet([EXCEL_IMPORT_HEADERS, SAMPLE_ROW])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '直播订单导入')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

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

async function importTbOrderItems(items = [], operator = '') {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      total: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      message: '导入数据不能为空'
    }
  }

  const table = orderStore.getOrdersTableRef()
  let success = 0
  let skipped = 0
  const errors = []

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

  return {
    total: items.length,
    success,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 20)
  }
}

module.exports = {
  buildExcelImportTemplateBuffer,
  parseExcelBuffer,
  importTbOrderItems
}
