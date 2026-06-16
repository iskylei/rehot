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
  '支付日期': 'orderPaidTime',
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
  user_flow: 'userFlow',
  '流量': 'userFlow'
}

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

function normalizeHeader(header) {
  const key = String(header || '').trim().replace(/^\uFEFF/, '')
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key]
  if (CAMEL_TO_DB[key]) return key
  return null
}

function normalizePayload(raw = {}) {
  const result = {}
  Object.entries(raw).forEach(([key, value]) => {
    const normalizedKey = normalizeHeader(key) || (CAMEL_TO_DB[key] ? key : null)
    if (!normalizedKey) return
    if (normalizedKey === 'buyAmount') {
      const num = value === '' || value == null ? null : Number(value)
      result.buyAmount = Number.isNaN(num) ? null : num
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
    row[dbCol] = payload[camel] ?? ''
  })
  row.create_by = payload.createBy || operator
  row.update_by = operator
  row.create_time = payload.createTime || now
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
  normalizeHeader,
  normalizePayload,
  payloadToDbRow,
  buildUpdateSets
}
