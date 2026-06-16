const { parseAmount, parseRatio, getTodayRange, getMonthRange } = require('../utils/amount')
const { formatDateString, getLast60DaysRange } = require('../utils/orderDate')
const orderStore = require('./orderStore')

function buildWhereClause(filters = {}, options = {}) {
  const { excludeDateRange = false } = options
  const {
    loginUserName = '',
    scopedLoginUserName = '',
    adUserNick = '',
    sellerNick = '',
    itemTitle = '',
    orderStatus = '',
    startDate = '',
    endDate = ''
  } = filters

  let sql = 'WHERE 1=1'
  const params = []

  if (scopedLoginUserName) {
    sql += ' AND login_user_name = ?'
    params.push(scopedLoginUserName)
  } else if (loginUserName) {
    sql += ' AND login_user_name LIKE ?'
    params.push(`%${loginUserName}%`)
  }
  if (adUserNick) {
    sql += ' AND ad_user_nick LIKE ?'
    params.push(`%${adUserNick}%`)
  }
  if (sellerNick) {
    sql += ' AND seller_nick LIKE ?'
    params.push(`%${sellerNick}%`)
  }
  if (itemTitle) {
    sql += ' AND item_title LIKE ?'
    params.push(`%${itemTitle}%`)
  }
  if (orderStatus) {
    sql += ' AND order_status = ?'
    params.push(orderStatus)
  }
  if (!excludeDateRange) {
    if (startDate) {
      sql += ' AND order_paid_time >= ?'
      params.push(startDate)
    }
    if (endDate) {
      sql += ' AND order_paid_time <= ?'
      params.push(endDate.includes(':') ? endDate : `${endDate} 23:59:59`)
    }
  }

  return { sql, params }
}

async function fetchRows(filters = {}) {
  const table = orderStore.getOrdersTableRef()
  const { sql, params } = buildWhereClause(filters)
  return orderStore.queryAll(`
    SELECT * FROM ${table}
    ${sql}
    ORDER BY order_paid_time DESC, id DESC
  `, params)
}

async function fetchRowsPaged(filters = {}, page = 1, pageSize = 20) {
  const table = orderStore.getOrdersTableRef()
  const { sql, params } = buildWhereClause(filters)
  const pageNum = Math.max(1, Number(page) || 1)
  const sizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20))
  const offset = (pageNum - 1) * sizeNum

  const totalRow = await orderStore.queryOne(
    `SELECT COUNT(*) AS count FROM ${table} ${sql}`,
    params
  )
  const total = Number(totalRow?.count) || 0
  const rows = await orderStore.queryAll(`
    SELECT * FROM ${table}
    ${sql}
    ORDER BY order_paid_time DESC, id DESC
    LIMIT ? OFFSET ?
  `, [...params, sizeNum, offset])

  return { rows, total, page: pageNum, pageSize: sizeNum }
}

function calcStats(rows) {
  let totalOrderAmount = 0
  let totalRefundAmount = 0
  let totalPredictAmount = 0
  let ratioSum = 0
  let ratioCount = 0
  let latestPaidTime = ''

  rows.forEach(row => {
    totalOrderAmount += parseAmount(row.order_amount)
    totalRefundAmount += parseAmount(row.refund_amount)
    totalPredictAmount += parseAmount(row.predict_amount)

    const ratio = parseRatio(row.seller_commission_ratio)
    if (ratio !== null) {
      ratioSum += ratio
      ratioCount += 1
    }

    if (row.order_paid_time && row.order_paid_time > latestPaidTime) {
      latestPaidTime = row.order_paid_time
    }
  })

  return {
    totalOrderAmount,
    totalRefundAmount,
    totalPredictAmount,
    avgCommissionRatio: ratioCount ? ratioSum / ratioCount : 0,
    latestPaidTime
  }
}

function getTodayDateString() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function resolveDateRange(filters = {}) {
  const today = getTodayDateString()
  const startDate = filters.startDate || today
  const endDate = filters.endDate || startDate
  return { startDate, endDate }
}

function formatDateRangeLabel(startDate, endDate) {
  return startDate === endDate ? startDate : `${startDate} 至 ${endDate}`
}

async function calcProductCommissionStats(filters = {}) {
  const table = orderStore.getOrdersTableRef()
  const { startDate, endDate } = resolveDateRange(filters)
  const { sql, params } = buildWhereClause({
    ...filters,
    startDate,
    endDate
  })

  const rows = await orderStore.queryAll(`
    SELECT
      COALESCE(NULLIF(${orderStore.trimExpr('item_title')}, ''), '未知商品') AS item_title,
      COUNT(*) AS order_count,
      SUM(${orderStore.amountExpr('predict_amount')}) AS total_predict_amount
    FROM ${table}
    ${sql}
      AND order_paid_time IS NOT NULL
      AND ${orderStore.trimExpr('order_paid_time')} != ''
    GROUP BY item_title
    ORDER BY total_predict_amount DESC, item_title ASC
  `, params)

  return {
    startDate,
    endDate,
    dateRange: formatDateRangeLabel(startDate, endDate),
    items: rows.map(row => ({
      itemTitle: row.item_title,
      orderCount: Number(row.order_count) || 0,
      totalPredictAmount: parseAmount(row.total_predict_amount)
    }))
  }
}

async function calcAdUserAmountStats(filters = {}) {
  const table = orderStore.getOrdersTableRef()
  const { startDate, endDate } = resolveDateRange(filters)
  const { sql, params } = buildWhereClause({
    ...filters,
    startDate,
    endDate
  })

  const rows = await orderStore.queryAll(`
    SELECT
      COALESCE(NULLIF(${orderStore.trimExpr('ad_user_nick')}, ''), '未知达人') AS ad_user_nick,
      COUNT(*) AS order_count,
      SUM(${orderStore.amountExpr('order_amount')}) AS total_amount,
      SUM(${orderStore.amountExpr('predict_amount')}) AS total_predict_amount
    FROM ${table}
    ${sql}
      AND order_paid_time IS NOT NULL
      AND ${orderStore.trimExpr('order_paid_time')} != ''
    GROUP BY ad_user_nick
    ORDER BY total_amount DESC, ad_user_nick ASC
  `, params)

  return {
    startDate,
    endDate,
    dateRange: formatDateRangeLabel(startDate, endDate),
    items: rows.map(row => ({
      adUserNick: row.ad_user_nick,
      orderCount: Number(row.order_count) || 0,
      totalAmount: parseAmount(row.total_amount),
      totalPredictAmount: parseAmount(row.total_predict_amount)
    }))
  }
}

async function calcSellerAmountStats(filters = {}) {
  const table = orderStore.getOrdersTableRef()
  const { startDate, endDate } = resolveDateRange(filters)
  const { sql, params } = buildWhereClause({
    ...filters,
    startDate,
    endDate
  })

  const rows = await orderStore.queryAll(`
    SELECT
      COALESCE(NULLIF(${orderStore.trimExpr('seller_nick')}, ''), '未知店铺') AS seller_nick,
      COUNT(*) AS order_count,
      SUM(${orderStore.amountExpr('order_amount')}) AS total_amount,
      SUM(${orderStore.amountExpr('predict_amount')}) AS total_predict_amount
    FROM ${table}
    ${sql}
      AND order_paid_time IS NOT NULL
      AND ${orderStore.trimExpr('order_paid_time')} != ''
    GROUP BY seller_nick
    ORDER BY total_amount DESC, seller_nick ASC
  `, params)

  return {
    startDate,
    endDate,
    dateRange: formatDateRangeLabel(startDate, endDate),
    items: rows.map(row => ({
      sellerNick: row.seller_nick,
      orderCount: Number(row.order_count) || 0,
      totalAmount: parseAmount(row.total_amount),
      totalPredictAmount: parseAmount(row.total_predict_amount)
    }))
  }
}

function fillHourlyItems(rows) {
  const map = new Map(rows.map(row => [Number(row.paid_hour), row]))

  return Array.from({ length: 24 }, (_, hour) => {
    const row = map.get(hour)
    return {
      hour,
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      orderCount: Number(row?.order_count) || 0,
      totalAmount: parseAmount(row?.total_amount),
      totalPredictAmount: parseAmount(row?.total_predict_amount)
    }
  })
}

async function calcHourlyAmountStats(filters = {}) {
  const table = orderStore.getOrdersTableRef()
  const paidHour = orderStore.paidHourExpr('order_paid_time')
  const hourTimeCheck = orderStore.isMysqlOrders()
    ? `LENGTH(TRIM(order_paid_time)) >= 13 AND SUBSTRING(order_paid_time, 11, 1) = ' '`
    : `length(trim(order_paid_time)) >= 13 AND substr(order_paid_time, 11, 1) = ' '`
  const { startDate, endDate } = resolveDateRange(filters)
  const { sql, params } = buildWhereClause({
    ...filters,
    startDate,
    endDate
  })

  const rows = await orderStore.queryAll(`
    SELECT
      ${paidHour} AS paid_hour,
      COUNT(*) AS order_count,
      SUM(${orderStore.amountExpr('order_amount')}) AS total_amount,
      SUM(${orderStore.amountExpr('predict_amount')}) AS total_predict_amount
    FROM ${table}
    ${sql}
      AND order_paid_time IS NOT NULL
      AND ${orderStore.trimExpr('order_paid_time')} != ''
      AND ${hourTimeCheck}
    GROUP BY paid_hour
    ORDER BY paid_hour ASC
  `, params)

  return {
    startDate,
    endDate,
    dateRange: formatDateRangeLabel(startDate, endDate),
    items: fillHourlyItems(rows.filter(row => {
      const hour = Number(row.paid_hour)
      return hour >= 0 && hour <= 23
    }))
  }
}

function fillDailyItems(rows, startDate, endDate) {
  const map = new Map(rows.map(row => [row.paid_date, row]))
  const items = []
  const cursor = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  while (cursor <= end) {
    const paidDate = formatDateString(cursor)
    const row = map.get(paidDate)
    items.push({
      paidDate,
      orderCount: Number(row?.order_count) || 0,
      totalAmount: parseAmount(row?.total_amount)
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return items
}

async function calcDailyAmountStats(filters = {}) {
  const { startDate, endDate } = getLast60DaysRange()
  const table = orderStore.getOrdersTableRef()
  const paidDate = orderStore.paidDateExpr('order_paid_time')
  const { sql, params } = buildWhereClause({
    ...filters,
    startDate,
    endDate
  })

  const rows = await orderStore.queryAll(`
    SELECT
      ${paidDate} AS paid_date,
      COUNT(*) AS order_count,
      SUM(${orderStore.amountExpr('order_amount')}) AS total_amount
    FROM ${table}
    ${sql}
      AND order_paid_time IS NOT NULL
      AND ${orderStore.trimExpr('order_paid_time')} != ''
    GROUP BY paid_date
    ORDER BY paid_date ASC
  `, params)

  return {
    startDate,
    endDate,
    dateRange: formatDateRangeLabel(startDate, endDate),
    items: fillDailyItems(rows, startDate, endDate)
  }
}

async function calcProductChartStats(filters = {}) {
  const table = orderStore.getOrdersTableRef()
  const { sql, params } = buildWhereClause(filters)
  const rows = await orderStore.queryAll(`
    SELECT
      ${orderStore.paidDateExpr('order_paid_time')} AS paid_date,
      COALESCE(NULLIF(${orderStore.trimExpr('item_title')}, ''), '未知商品') AS item_title,
      COUNT(*) AS order_count,
      SUM(${orderStore.amountExpr('order_amount')}) AS total_amount
    FROM ${table}
    ${sql}
      AND order_paid_time IS NOT NULL
      AND ${orderStore.trimExpr('order_paid_time')} != ''
    GROUP BY paid_date, item_title
    ORDER BY paid_date ASC, item_title ASC
  `, params)

  return rows.map(row => ({
    paidDate: row.paid_date,
    itemTitle: row.item_title,
    orderCount: Number(row.order_count) || 0,
    totalAmount: parseAmount(row.total_amount)
  }))
}

function resolveSelectedDateRange(filters = {}) {
  const { startDate = '', endDate = '' } = filters
  if (startDate && endDate) {
    return {
      start: startDate,
      end: endDate.includes(':') ? endDate : `${endDate} 23:59:59`
    }
  }
  return getTodayRange()
}

async function calcGlobalOverview(filters = {}) {
  const table = orderStore.getOrdersTableRef()
  const orderAmount = orderStore.amountExpr('order_amount')
  const refundAmount = orderStore.amountExpr('refund_amount')
  const predictAmount = orderStore.amountExpr('predict_amount')
  const avgRatio = orderStore.validRatioExpr('seller_commission_ratio')
  const { start: monthStart, end: monthEnd } = getMonthRange()
  const { start: selectedStart, end: selectedEnd } = resolveSelectedDateRange(filters)

  const globalFilters = {}
  if (filters.scopedLoginUserName) {
    globalFilters.scopedLoginUserName = filters.scopedLoginUserName
  }
  const { sql: globalSql, params: globalParams } = buildWhereClause(globalFilters, { excludeDateRange: true })
  const { sql: periodSql, params: periodParams } = buildWhereClause(globalFilters, { excludeDateRange: true })
  const { sql: selectedSql, params: selectedParams } = buildWhereClause({
    ...globalFilters,
    startDate: selectedStart,
    endDate: selectedEnd
  })

  const row = await orderStore.queryOne(`
    SELECT
      COALESCE(SUM(${orderAmount}), 0) AS total_order_amount,
      COALESCE(SUM(${refundAmount}), 0) AS total_refund_amount,
      COALESCE(SUM(${predictAmount}), 0) AS total_predict_amount,
      AVG(${avgRatio}) AS avg_commission_ratio,
      MAX(order_paid_time) AS latest_paid_time
    FROM ${table}
    ${globalSql}
  `, globalParams)

  const selectedRow = await orderStore.queryOne(`
    SELECT
      COALESCE(SUM(${orderAmount}), 0) AS today_order_amount,
      COALESCE(SUM(${predictAmount}), 0) AS today_predict_amount,
      COALESCE(SUM(${refundAmount}), 0) AS today_refund_amount
    FROM ${table}
    ${selectedSql}
  `, selectedParams)

  const periodRow = await orderStore.queryOne(`
    SELECT
      COALESCE(SUM(CASE
        WHEN order_paid_time >= ? AND order_paid_time <= ?
        THEN ${orderAmount}
        ELSE 0
      END), 0) AS month_order_amount
    FROM ${table}
    ${periodSql}
  `, [monthStart, monthEnd, ...periodParams])

  const avgCommissionRatio = row?.avg_commission_ratio
  return {
    totalOrderAmount: parseAmount(row?.total_order_amount),
    todayOrderAmount: parseAmount(selectedRow?.today_order_amount),
    todayPredictAmount: parseAmount(selectedRow?.today_predict_amount),
    todayRefundAmount: parseAmount(selectedRow?.today_refund_amount),
    monthOrderAmount: parseAmount(periodRow?.month_order_amount),
    totalRefundAmount: parseAmount(row?.total_refund_amount),
    totalPredictAmount: parseAmount(row?.total_predict_amount),
    avgCommissionRatio: avgCommissionRatio === null || avgCommissionRatio === undefined
      ? 0
      : Number(avgCommissionRatio),
    latestPaidTime: row?.latest_paid_time || ''
  }
}

async function fetchRowsForExport(filters = {}) {
  const table = orderStore.getOrdersTableRef()
  const { sql, params } = buildWhereClause(filters)
  return orderStore.queryAll(`
    SELECT
      biz_order_id,
      parent_order_id,
      seller_nick,
      item_title,
      item_id,
      ad_user_nick,
      agency_nick,
      order_status,
      order_paid_time,
      order_amount,
      predict_amount,
      order_commission_amount,
      seller_commission_ratio,
      refund_amount,
      predict_total_amount,
      buy_amount,
      login_user_name
    FROM ${table}
    ${sql}
    ORDER BY order_paid_time DESC, id DESC
  `, params)
}

module.exports = {
  buildWhereClause,
  fetchRows,
  fetchRowsPaged,
  fetchRowsForExport,
  calcStats,
  calcProductChartStats,
  calcProductCommissionStats,
  calcAdUserAmountStats,
  calcSellerAmountStats,
  calcHourlyAmountStats,
  calcDailyAmountStats,
  calcGlobalOverview
}
