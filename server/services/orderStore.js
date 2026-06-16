const { db } = require('../db')
const { usesMysqlOrders, getOrdersDatabaseName } = require('../config/database')
const mysqlDb = require('../db/mysql')

function getOrdersTableRef() {
  if (!usesMysqlOrders()) {
    return 'sys_tb_order'
  }
  const database = getOrdersDatabaseName()
  return `\`${database}\`.\`sys_tb_order\``
}

function isMysqlOrders() {
  return usesMysqlOrders()
}

async function queryAll(sql, params = []) {
  if (!usesMysqlOrders()) {
    return db.prepare(sql).all(...params)
  }
  return mysqlDb.queryAll(sql, params)
}

async function queryOne(sql, params = []) {
  if (!usesMysqlOrders()) {
    return db.prepare(sql).get(...params)
  }
  return mysqlDb.queryOne(sql, params)
}

async function execute(sql, params = []) {
  if (!usesMysqlOrders()) {
    return db.prepare(sql).run(...params)
  }
  return mysqlDb.execute(sql, params)
}

async function withTransaction(handler) {
  if (!usesMysqlOrders()) {
    const wrapped = db.transaction(() => handler())
    return wrapped()
  }
  return mysqlDb.withTransaction(handler)
}

function getLastInsertId(result) {
  if (!usesMysqlOrders()) {
    return result.lastInsertRowid
  }
  return result.insertId
}

function trimExpr(column) {
  return isMysqlOrders() ? `TRIM(${column})` : `trim(${column})`
}

function paidDateExpr(column = 'order_paid_time') {
  return isMysqlOrders()
    ? `SUBSTRING(${column}, 1, 10)`
    : `substr(${column}, 1, 10)`
}

function paidHourExpr(column = 'order_paid_time') {
  return isMysqlOrders()
    ? `CAST(SUBSTRING(${column}, 12, 2) AS UNSIGNED)`
    : `CAST(substr(${column}, 12, 2) AS INTEGER)`
}

function amountExpr(column) {
  return isMysqlOrders()
    ? `CAST(REPLACE(${column}, ',', '') AS DECIMAL(18, 2))`
    : `CAST(REPLACE(${column}, ',', '') AS REAL)`
}

function validRatioExpr(column) {
  const trimmed = trimExpr(column)
  const numeric = isMysqlOrders()
    ? `CAST(REPLACE(REPLACE(${column}, '%', ''), ',', '') AS DECIMAL(18, 4))`
    : `CAST(REPLACE(REPLACE(${column}, '%', ''), ',', '') AS REAL)`
  return `CASE WHEN ${trimmed} != '' THEN ${numeric} ELSE NULL END`
}

module.exports = {
  getOrdersTableRef,
  isMysqlOrders,
  queryAll,
  queryOne,
  execute,
  withTransaction,
  getLastInsertId,
  trimExpr,
  paidDateExpr,
  paidHourExpr,
  amountExpr,
  validRatioExpr
}
