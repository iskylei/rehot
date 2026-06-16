require('./env')

const VALID_DRIVERS = ['sqlite', 'hybrid', 'mysql']

function normalizeDriver(value) {
  const driver = String(value || 'sqlite').trim().toLowerCase()
  return VALID_DRIVERS.includes(driver) ? driver : 'sqlite'
}

function getDatabaseConfig() {
  const driver = normalizeDriver(process.env.DB_DRIVER)
  const mysql = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'rehot',
    ordersDatabase: process.env.MYSQL_ORDERS_DATABASE || 'data_analysis',
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10)
  }

  return {
    driver,
    sqlite: {
      file: process.env.SQLITE_FILE || ''
    },
    mysql
  }
}

function usesMysqlOrders() {
  const driver = getDatabaseConfig().driver
  return driver === 'hybrid' || driver === 'mysql'
}

function usesSqliteApp() {
  const driver = getDatabaseConfig().driver
  return driver === 'sqlite' || driver === 'hybrid'
}

function usesMysqlApp() {
  return getDatabaseConfig().driver === 'mysql'
}

function getOrdersDatabaseName() {
  const { driver, mysql } = getDatabaseConfig()
  if (driver === 'mysql') {
    // 全 MySQL 模式：配置了 MYSQL_ORDERS_DATABASE 时，订单表走独立库（如 data_analysis）
    if (process.env.MYSQL_ORDERS_DATABASE) {
      return mysql.ordersDatabase
    }
    return mysql.database
  }
  return mysql.ordersDatabase
}

function usesSplitMysqlDatabases() {
  const { driver, mysql } = getDatabaseConfig()
  return driver === 'mysql'
    && Boolean(process.env.MYSQL_ORDERS_DATABASE)
    && mysql.ordersDatabase !== mysql.database
}

module.exports = {
  VALID_DRIVERS,
  getDatabaseConfig,
  usesMysqlOrders,
  usesSqliteApp,
  usesMysqlApp,
  getOrdersDatabaseName,
  usesSplitMysqlDatabases
}
