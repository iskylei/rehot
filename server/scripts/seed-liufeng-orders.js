const fs = require('fs')
const path = require('path')
require('../config/env')
require('../db')
const orderStore = require('../services/orderStore')
const { normalizeSeedRow } = require('./update-test-order-dates')

const MARKER_ID = '2994029112367657078'
const SQL_PATH = path.join(__dirname, '../seeds/liufeng-orders.sql')

function parseValue(token) {
  const trimmed = token.trim()
  if (trimmed === 'NULL') return null
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'")
  }
  return trimmed
}

function parseRows(sql) {
  const valuesPart = sql.split(/VALUES\s*/i)[1]
  if (!valuesPart) return []

  const rows = []
  let current = ''
  let depth = 0
  let inQuote = false

  for (let i = 0; i < valuesPart.length; i += 1) {
    const ch = valuesPart[i]
    const prev = valuesPart[i - 1]

    if (ch === "'" && prev !== '\\') inQuote = !inQuote
    if (!inQuote) {
      if (ch === '(') depth += 1
      if (ch === ')') depth -= 1
    }

    current += ch

    if (!inQuote && depth === 0 && ch === ')') {
      const tuple = current.trim().replace(/^,?\s*/, '').replace(/;?\s*$/, '')
      if (tuple.startsWith('(')) {
        const inner = tuple.slice(1, -1)
        const values = []
        let part = ''
        let quoted = false
        for (let j = 0; j < inner.length; j += 1) {
          const c = inner[j]
          const p = inner[j - 1]
          if (c === "'" && p !== '\\') quoted = !quoted
          if (c === ',' && !quoted) {
            values.push(parseValue(part))
            part = ''
          } else {
            part += c
          }
        }
        values.push(parseValue(part))
        rows.push(values)
      }
      current = ''
    }
  }

  return rows
}

async function orderExists(bizOrderId) {
  const table = orderStore.getOrdersTableRef()
  const row = await orderStore.queryOne(`SELECT id FROM ${table} WHERE biz_order_id = ?`, [bizOrderId])
  return Boolean(row)
}

async function seedLiufengOrders({ force = false } = {}) {
  const exists = await orderExists(MARKER_ID)
  if (exists && !force) {
    return { skipped: true, message: '柳风文化测试数据已存在，跳过导入' }
  }

  const sql = fs.readFileSync(SQL_PATH, 'utf8')
  const rows = parseRows(sql)

  const table = orderStore.getOrdersTableRef()
  let inserted = 0
  let skipped = 0

  for (const values of rows) {
    const bizOrderId = values[0]
    if (await orderExists(bizOrderId)) {
      skipped += 1
      continue
    }
    const row = normalizeSeedRow(values)
    await orderStore.execute(`
      INSERT INTO ${table} (
        biz_order_id, parent_order_id, seller_nick, item_title, item_id,
        ad_user_nick, agency_nick, order_status, order_paid_time, order_amount,
        predict_amount, order_commission_amount, seller_commission_ratio, remark,
        refund_amount, predict_total_amount, buy_amount, create_by, create_time,
        update_by, update_time, login_user_name, user_flow
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `, row)
    inserted += 1
  }

  return {
    skipped: false,
    total: rows.length,
    inserted,
    duplicateSkipped: skipped,
    message: `导入完成：新增 ${inserted} 条，跳过重复 ${skipped} 条`
  }
}

if (require.main === module) {
  const force = process.argv.includes('--force')
  const { initMysqlPools } = require('../db/mysql')
  const { usesMysqlOrders } = require('../config/database')

  ;(async () => {
    if (usesMysqlOrders()) {
      await initMysqlPools()
    }
    const result = await seedLiufengOrders({ force })
    console.log(result.message || result)
  })().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}

module.exports = { seedLiufengOrders }
