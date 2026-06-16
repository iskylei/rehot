const orderStore = require('../services/orderStore')
const { formatDateString } = require('../utils/orderDate')

const TEST_ORGANIZATIONS = [
  { code: 'LIANQI', name: '联奇文化' },
  { code: 'LIUFENG', name: '柳风文化' },
  { code: 'XINGHUO', name: '星火机构' },
  { code: 'LANHAI', name: '蓝海机构' }
]

const AD_USERS = ['达人小美', '达人阿杰', '好好洗衣机', '家电焕新记']
const SELLERS = ['热浪旗舰店', '海尔洗衣机旗舰店', '清凉好物店', '联奇优选店']
const PRODUCTS = [
  { title: '夏季防晒喷雾', id: 'SKU-1001', amount: 299, ratio: '10%' },
  { title: '便携小风扇', id: 'SKU-1002', amount: 159.5, ratio: '10%' },
  { title: '冰感毛巾', id: 'SKU-2001', amount: 89, ratio: '8%' },
  { title: '空气循环扇', id: 'SKU-3001', amount: 428, ratio: '12%' },
  { title: '户外遮阳伞', id: 'SKU-3002', amount: 198, ratio: '9%' }
]
const STATUSES = ['订单已支付', '订单已确认收货', '订单售中退款关闭']
const FLOWS = ['直播推荐', '短视频引流', '搜索直达']

function addDays(date, offset) {
  const next = new Date(date)
  next.setDate(next.getDate() + offset)
  return next
}

function buildPaidTime(date, hour, minute = 0) {
  const day = formatDateString(date)
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return `${day} ${hh}:${mm}:00`
}

function calcPredictAmount(amount, ratio) {
  const percent = Number.parseFloat(String(ratio).replace('%', '')) || 0
  return (amount * percent / 100).toFixed(2)
}

function buildOrgOrders() {
  const today = new Date()
  const orders = []

  TEST_ORGANIZATIONS.forEach((org, orgIndex) => {
    for (let i = 0; i < 10; i += 1) {
      const product = PRODUCTS[(orgIndex + i) % PRODUCTS.length]
      const dayOffset = i < 3 ? 0 : i < 6 ? -(i - 2) : -(10 + i * 3)
      const paidDate = addDays(today, dayOffset)
      const hour = 8 + ((orgIndex * 3 + i * 2) % 14)
      const amount = product.amount + orgIndex * 20 + i * 5
      const ratio = product.ratio
      const predictAmount = calcPredictAmount(amount, ratio)
      const status = i === 9 ? '订单售中退款关闭' : STATUSES[i % 2]
      const refundAmount = status === '订单售中退款关闭' ? String(amount) : '0'
      const seq = String(i + 1).padStart(3, '0')

      orders.push({
        biz_order_id: `ORGSEED-${org.code}-${seq}`,
        parent_order_id: `PARENT-${org.code}-${seq}`,
        seller_nick: SELLERS[(orgIndex + i) % SELLERS.length],
        item_title: `${product.title}（${org.name}）`,
        item_id: product.id,
        ad_user_nick: AD_USERS[(orgIndex + i) % AD_USERS.length],
        agency_nick: org.name,
        order_status: status,
        order_paid_time: buildPaidTime(paidDate, hour, (i * 7) % 60),
        order_amount: amount.toFixed(2),
        predict_amount: predictAmount,
        order_commission_amount: amount.toFixed(2),
        seller_commission_ratio: ratio,
        remark: status === '订单售中退款关闭' ? '测试退款' : '',
        refund_amount: refundAmount,
        predict_total_amount: amount.toFixed(2),
        buy_amount: (i % 3) + 1,
        login_user_name: org.name,
        user_flow: FLOWS[i % FLOWS.length]
      })
    }
  })

  return orders
}

async function orderExists(bizOrderId) {
  const table = orderStore.getOrdersTableRef()
  const row = await orderStore.queryOne(
    `SELECT id FROM ${table} WHERE biz_order_id = ?`,
    [bizOrderId]
  )
  return Boolean(row)
}

async function deleteOrgSeedOrders() {
  const table = orderStore.getOrdersTableRef()
  if (orderStore.isMysqlOrders()) {
    const result = await orderStore.execute(
      `DELETE FROM ${table} WHERE biz_order_id LIKE 'ORGSEED-%'`
    )
    return result.affectedRows || 0
  }
  const result = await orderStore.execute(
    `DELETE FROM ${table} WHERE biz_order_id LIKE 'ORGSEED-%'`
  )
  return result.changes || 0
}

async function seedOrgOrders({ force = false } = {}) {
  const markerId = 'ORGSEED-LIANQI-001'
  const exists = await orderExists(markerId)

  if (exists && !force) {
    return {
      skipped: true,
      organizations: TEST_ORGANIZATIONS.map(item => item.name),
      message: '机构测试订单已存在，跳过导入（可使用 --force 重新生成）'
    }
  }

  if (force && exists) {
    await deleteOrgSeedOrders()
  }

  const orders = buildOrgOrders()
  const table = orderStore.getOrdersTableRef()
  let inserted = 0
  let duplicateSkipped = 0
  const nowExpr = orderStore.isMysqlOrders() ? 'NOW()' : "datetime('now')"

  for (const order of orders) {
    if (await orderExists(order.biz_order_id)) {
      duplicateSkipped += 1
      continue
    }

    await orderStore.execute(`
      INSERT INTO ${table} (
        biz_order_id, parent_order_id, seller_nick, item_title, item_id,
        ad_user_nick, agency_nick, order_status, order_paid_time, order_amount,
        predict_amount, order_commission_amount, seller_commission_ratio, remark,
        refund_amount, predict_total_amount, buy_amount, login_user_name, user_flow,
        create_time, update_time
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ${nowExpr}, ${nowExpr}
      )
    `, [
      order.biz_order_id,
      order.parent_order_id,
      order.seller_nick,
      order.item_title,
      order.item_id,
      order.ad_user_nick,
      order.agency_nick,
      order.order_status,
      order.order_paid_time,
      order.order_amount,
      order.predict_amount,
      order.order_commission_amount,
      order.seller_commission_ratio,
      order.remark,
      order.refund_amount,
      order.predict_total_amount,
      order.buy_amount,
      order.login_user_name,
      order.user_flow
    ])
    inserted += 1
  }

  return {
    skipped: false,
    organizations: TEST_ORGANIZATIONS.map(item => item.name),
    total: orders.length,
    inserted,
    duplicateSkipped,
    message: `机构测试订单导入完成：新增 ${inserted} 条，跳过重复 ${duplicateSkipped} 条`
  }
}

module.exports = {
  TEST_ORGANIZATIONS,
  buildOrgOrders,
  seedOrgOrders
}
