const XLSX = require('xlsx')
const { fetchRowsForExport } = require('./tbOrderQuery')

const EXPORT_HEADERS = [
  '淘宝子编号',
  '淘宝主编号',
  '服务商昵称',
  '商品名称',
  '商品编号',
  '达人昵称',
  '机构昵称',
  '订单状态',
  '支付日期',
  '支付金额',
  '预估佣金收入',
  '成交金额',
  '佣金比例',
  '退款金额',
  '预测总金额',
  '购买数量',
  '登录用户'
]

const EXPORT_COLUMNS = [
  'biz_order_id',
  'parent_order_id',
  'seller_nick',
  'item_title',
  'item_id',
  'ad_user_nick',
  'agency_nick',
  'order_status',
  'order_paid_time',
  'order_amount',
  'predict_amount',
  'order_commission_amount',
  'seller_commission_ratio',
  'refund_amount',
  'predict_total_amount',
  'buy_amount',
  'login_user_name'
]

function formatExportCell(value) {
  if (value === null || value === undefined) return ''
  return value
}

function buildExportRows(rows) {
  return rows.map(row => EXPORT_COLUMNS.map(column => formatExportCell(row[column])))
}

function buildExportFilename(startDate, endDate) {
  const rangeLabel = startDate === endDate ? startDate : `${startDate}_${endDate}`
  return `直播订单_${rangeLabel}.xlsx`
}

async function buildLiveOverviewWorkbook(filters = {}) {
  const rows = await fetchRowsForExport(filters)
  const sheetData = [EXPORT_HEADERS, ...buildExportRows(rows)]
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '直播订单')
  return {
    workbook,
    rowCount: rows.length,
    filename: buildExportFilename(filters.startDate, filters.endDate)
  }
}

async function buildLiveOverviewExcelBuffer(filters = {}) {
  const { workbook, rowCount, filename } = await buildLiveOverviewWorkbook(filters)
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return { buffer, rowCount, filename }
}

module.exports = {
  EXPORT_HEADERS,
  buildLiveOverviewExcelBuffer
}
