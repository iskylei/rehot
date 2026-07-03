const { normalizeImportDateTime } = require('../utils/importDateTime')

const HEADER_ALIASES = {
  biz_order_id: 'bizOrderId',
  '淘宝子编号': 'bizOrderId',
  parent_order_id: 'parentOrderId',
  '淘宝主编号': 'parentOrderId',
  seller_nick: 'sellerNick',
  '服务商昵称': 'sellerNick',
  item_title: 'itemTitle',
  '商品名称': 'itemTitle',
  item_id: 'itemId',
  '商品编号': 'itemId',
  ad_user_nick: 'adUserNick',
  '达人昵称': 'adUserNick',
  agency_nick: 'agencyNick',
  '机构昵称': 'agencyNick',
  order_status: 'orderStatus',
  '订单状态': 'orderStatus',
  order_paid_time: 'orderPaidTime',
  'order paid time': 'orderPaidTime',
  '支付日期': 'orderPaidTime',
  '支付时间': 'orderPaidTime',
  order_amount: 'orderAmount',
  '支付金额': 'orderAmount',
  predict_amount: 'predictAmount',
  '预估佣金收入': 'predictAmount',
  order_commission_amount: 'orderCommissionAmount',
  '成交金额': 'orderCommissionAmount',
  seller_commission_ratio: 'sellerCommissionRatio',
  '佣金比例': 'sellerCommissionRatio',
  remark: 'remark',
  '备注': 'remark',
  refund_amount: 'refundAmount',
  '退款金额': 'refundAmount',
  predict_total_amount: 'predictTotalAmount',
  '预测总金额': 'predictTotalAmount',
  buy_amount: 'buyAmount',
  '购买数量': 'buyAmount',
  login_user_name: 'loginUserName',
  '机构名称': 'loginUserName',
  'login user name': 'loginUserName',
  create_time: 'createTime',
  'create time': 'createTime',
  '创建时间': 'createTime',
  seller_commission_rate: 'sellerCommissionRatio',
  'seller commission rate': 'sellerCommissionRatio',
  user_flow: 'userFlow',
  '流量': 'userFlow'
}

const EXCEL_IMPORT_HEADERS = [
  'parent order id',
  'biz-order id',
  'seller nick',
  'item title',
  'item id',
  'ad user nick',
  'login user name',
  'order status',
  'create time',
  'order paid time',
  'order amount',
  'refund amount',
  'seller commission rate',
  'predict amount'
]

const CAMEL_TO_DB = {
  bizOrderId: 'biz_order_id',
  parentOrderId: 'parent_order_id',
  sellerNick: 'seller_nick',
  itemTitle: 'item_title',
  itemId: 'item_id',
  adUserNick: 'ad_user_nick',
  agencyNick: 'agency_nick',
  orderStatus: 'order_status',
  orderPaidTime: 'order_paid_time',
  orderAmount: 'order_amount',
  predictAmount: 'predict_amount',
  orderCommissionAmount: 'order_commission_amount',
  sellerCommissionRatio: 'seller_commission_ratio',
  remark: 'remark',
  refundAmount: 'refund_amount',
  predictTotalAmount: 'predict_total_amount',
  buyAmount: 'buy_amount',
  loginUserName: 'login_user_name',
  userFlow: 'user_flow'
}

const CSV_TEMPLATE_HEADERS = [
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
  'remark',
  'refund_amount',
  'predict_total_amount',
  'buy_amount',
  'login_user_name',
  'user_flow'
]

function normalizeHeaderText(header) {
  return String(header || '').trim().replace(/^\uFEFF/, '').replace(/\s+/g, ' ')
}

function isPaymentDateHeader(header) {
  const text = normalizeHeaderText(header).toLowerCase()
  return text === 'order paid time'
    || text === 'order_paid_time'
    || text === '支付日期'
    || text === '支付时间'
    || /^paid[\s_-]*time$/.test(text)
    || /^order[\s_-]*paid[\s_-]*time$/.test(text)
}

function isCreateTimeHeader(header) {
  const text = normalizeHeaderText(header).toLowerCase()
  return text === 'create time'
    || text === 'create_time'
    || text === '创建时间'
    || /^create[\s_-]*time$/.test(text)
}

function resolveImportFieldKey(header) {
  const normalizedHeader = normalizeHeaderText(header)
  const normalizedKey = normalizeHeader(normalizedHeader)
  if (normalizedKey) return normalizedKey
  if (isPaymentDateHeader(normalizedHeader)) return 'orderPaidTime'
  if (isCreateTimeHeader(normalizedHeader)) return 'createTime'
  return null
}

function normalizeHeader(header) {
  const raw = normalizeHeaderText(header)
  if (!raw) return null
  if (HEADER_ALIASES[raw]) return HEADER_ALIASES[raw]
  if (CAMEL_TO_DB[raw]) return raw

  const lowered = raw.toLowerCase()
  if (HEADER_ALIASES[lowered]) return HEADER_ALIASES[lowered]

  const snakeKey = lowered.replace(/[\s-]+/g, '_')
  if (HEADER_ALIASES[snakeKey]) return HEADER_ALIASES[snakeKey]

  const camelKey = snakeKey.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
  if (CAMEL_TO_DB[camelKey]) return camelKey

  return null
}

const DATE_TIME_FIELDS = new Set(['createTime', 'orderPaidTime'])

function normalizePayload(raw = {}) {
  const result = {}
  Object.entries(raw).forEach(([key, value]) => {
    const normalizedKey = resolveImportFieldKey(key)
    if (!normalizedKey) return
    if (normalizedKey === 'buyAmount') {
      const num = value === '' || value == null ? null : Number(value)
      result.buyAmount = Number.isNaN(num) ? null : num
      return
    }
    if (DATE_TIME_FIELDS.has(normalizedKey)) {
      result[normalizedKey] = normalizeImportDateTime(value)
      return
    }
    result[normalizedKey] = value == null ? '' : String(value).trim()
  })
  return result
}

function payloadToDbRow(payload, operator = '') {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const row = {}
  Object.entries(CAMEL_TO_DB).forEach(([camel, dbCol]) => {
    if (camel === 'buyAmount') {
      row[dbCol] = payload.buyAmount == null || payload.buyAmount === '' ? null : Number(payload.buyAmount)
      return
    }
    if (camel === 'createTime' || camel === 'orderPaidTime') {
      row[dbCol] = payload[camel] ? normalizeImportDateTime(payload[camel]) : ''
      return
    }
    row[dbCol] = payload[camel] ?? ''
  })
  row.create_by = payload.createBy || operator
  row.update_by = operator
  row.create_time = payload.createTime ? normalizeImportDateTime(payload.createTime) : now
  row.update_time = now
  return row
}

function buildUpdateSets(payload, operator = '') {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const sets = []
  const values = []

  Object.entries(CAMEL_TO_DB).forEach(([camel, dbCol]) => {
    if (payload[camel] === undefined) return
    sets.push(`${dbCol} = ?`)
    if (camel === 'buyAmount') {
      values.push(payload.buyAmount == null || payload.buyAmount === '' ? null : Number(payload.buyAmount))
      return
    }
    values.push(payload[camel] ?? '')
  })

  sets.push('update_by = ?', 'update_time = ?')
  values.push(operator, now)

  return { sets, values, now }
}

module.exports = {
  HEADER_ALIASES,
  CAMEL_TO_DB,
  CSV_TEMPLATE_HEADERS,
  EXCEL_IMPORT_HEADERS,
  normalizeHeader,
  resolveImportFieldKey,
  isPaymentDateHeader,
  isCreateTimeHeader,
  normalizePayload,
  payloadToDbRow,
  buildUpdateSets
}
