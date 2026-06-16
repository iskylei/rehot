require('../config/env')
const orderStore = require('../services/orderStore')
const { initMysqlPools } = require('../db/mysql')
const { usesMysqlOrders } = require('../config/database')
const { getTodayDateString, normalizePaidTimeToToday } = require('../utils/orderDate')

const PAID_TIME_INDEX = 8

async function updateTestOrderPaidDates() {
  const today = getTodayDateString()
  const table = orderStore.getOrdersTableRef()
  const rows = await orderStore.queryAll(`
    SELECT id, order_paid_time
    FROM ${table}
    WHERE login_user_name = '柳风文化' OR biz_order_id LIKE 'DEMO-%'
  `)

  for (const row of rows) {
    const paidTime = normalizePaidTimeToToday(row.order_paid_time)
    if (orderStore.isMysqlOrders()) {
      await orderStore.execute(
        `UPDATE ${table} SET order_paid_time = ?, update_time = NOW() WHERE id = ?`,
        [paidTime, row.id]
      )
    } else {
      await orderStore.execute(
        `UPDATE ${table} SET order_paid_time = ?, update_time = datetime('now') WHERE id = ?`,
        [paidTime, row.id]
      )
    }
  }

  return {
    today,
    updated: rows.length,
    message: `已将 ${rows.length} 条测试订单支付日期更新为 ${today}`
  }
}

function normalizeSeedRow(values) {
  const next = [...values]
  next[PAID_TIME_INDEX] = normalizePaidTimeToToday(next[PAID_TIME_INDEX])
  return next
}

if (require.main === module) {
  ;(async () => {
    if (usesMysqlOrders()) {
      await initMysqlPools()
    }
    const result = await updateTestOrderPaidDates()
    console.log(result.message)
  })().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}

module.exports = {
  updateTestOrderPaidDates,
  normalizeSeedRow,
  PAID_TIME_INDEX
}
