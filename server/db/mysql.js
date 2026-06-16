const mysql = require('mysql2/promise')
const { getDatabaseConfig, usesMysqlOrders, usesMysqlApp, getOrdersDatabaseName } = require('../config/database')

let appPool = null
let ordersPool = null

function buildPoolOptions(database) {
  const cfg = getDatabaseConfig().mysql
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database,
    connectionLimit: cfg.connectionLimit,
    waitForConnections: true,
    charset: 'utf8mb4',
    timezone: '+08:00'
  }
}

async function initMysqlPools() {
  const cfg = getDatabaseConfig()

  if (usesMysqlApp()) {
    appPool = mysql.createPool(buildPoolOptions(cfg.mysql.database))
  }

  if (usesMysqlOrders()) {
    const ordersDatabase = getOrdersDatabaseName()

    if (appPool && ordersDatabase === cfg.mysql.database) {
      ordersPool = appPool
    } else {
      ordersPool = mysql.createPool(buildPoolOptions(ordersDatabase))
    }
  }

  return { appPool, ordersPool }
}

async function initMysqlPool() {
  return initMysqlPools()
}

function getAppPool() {
  if (!appPool) {
    throw new Error('MySQL 应用连接池未初始化，请先调用 initMysqlPools()')
  }
  return appPool
}

function getOrdersPool() {
  if (!ordersPool) {
    throw new Error('MySQL 订单连接池未初始化，请先调用 initMysqlPools()')
  }
  return ordersPool
}

function getMysqlPool() {
  return getOrdersPool()
}

async function pingPool(pool, label) {
  const [rows] = await pool.query('SELECT 1 AS ok')
  return { label, ok: rows[0]?.ok === 1 }
}

async function pingMysql() {
  const result = { ok: true, app: null, orders: null }

  if (usesMysqlApp() && appPool) {
    result.app = await pingPool(appPool, 'app')
    if (!result.app.ok) result.ok = false
  }

  if (usesMysqlOrders() && ordersPool) {
    result.orders = await pingPool(ordersPool, 'orders')
    if (!result.orders.ok) result.ok = false
  }

  if (!usesMysqlApp() && !usesMysqlOrders()) {
    return { ok: true, skipped: true }
  }

  return result
}

async function closeMysqlPools() {
  const closes = []
  if (appPool && appPool !== ordersPool) {
    closes.push(appPool.end())
    appPool = null
  }
  if (ordersPool) {
    closes.push(ordersPool.end())
    ordersPool = null
  }
  await Promise.all(closes)
}

async function closeMysqlPool() {
  return closeMysqlPools()
}

async function queryAppAll(sql, params = []) {
  const [rows] = await getAppPool().execute(sql, params)
  return rows
}

async function queryAppOne(sql, params = []) {
  const rows = await queryAppAll(sql, params)
  return rows[0] || null
}

async function executeApp(sql, params = []) {
  const [result] = await getAppPool().execute(sql, params)
  return result
}

async function queryAll(sql, params = []) {
  const [rows] = await getOrdersPool().execute(sql, params)
  return rows
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params)
  return rows[0] || null
}

async function execute(sql, params = []) {
  const [result] = await getOrdersPool().execute(sql, params)
  return result
}

async function withTransaction(handler) {
  const connection = await getOrdersPool().getConnection()
  try {
    await connection.beginTransaction()
    const result = await handler(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = {
  initMysqlPools,
  initMysqlPool,
  getAppPool,
  getOrdersPool,
  getMysqlPool,
  pingMysql,
  closeMysqlPools,
  closeMysqlPool,
  queryAppAll,
  queryAppOne,
  executeApp,
  queryAll,
  queryOne,
  execute,
  withTransaction
}
