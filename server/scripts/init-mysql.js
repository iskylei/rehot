require('../config/env')

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const { getDatabaseConfig } = require('../config/database')

const MIGRATION_DIR = path.join(__dirname, '../migrations/mysql')

const MIGRATION_FILES = {
  app: '001_rehot_app.sql',
  orders: '002_data_analysis_orders.sql'
}

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(statement => statement.trim())
    .filter(statement => statement && !statement.startsWith('--'))
}

async function runMigrationFile(connection, filename) {
  const filePath = path.join(MIGRATION_DIR, filename)
  if (!fs.existsSync(filePath)) {
    throw new Error(`迁移文件不存在: ${filePath}`)
  }

  const sql = fs.readFileSync(filePath, 'utf8')
  const statements = splitSqlStatements(sql)
  for (const statement of statements) {
    await connection.query(statement)
  }
  console.log(`已执行: ${filename}`)
}

async function initMysql() {
  const cfg = getDatabaseConfig().mysql
  const target = process.argv.includes('--orders-only')
    ? 'orders'
    : process.argv.includes('--app-only')
      ? 'app'
      : 'all'

  const envPath = path.join(__dirname, '../../.env')
  console.log(`读取配置: ${fs.existsSync(envPath) ? '.env' : '系统环境变量/默认值'}`)
  console.log(`连接 MySQL: ${cfg.user}@${cfg.host}:${cfg.port}`)

  let connection
  try {
    connection = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      multipleStatements: true,
      charset: 'utf8mb4'
    })
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error(
        `MySQL 账号或密码错误（${cfg.user}@${cfg.host}:${cfg.port}）。` +
        '请检查项目根目录 .env 中的 MYSQL_USER / MYSQL_PASSWORD 是否与 MySQL 实际账号一致。'
      )
    }
    throw error
  }

  try {
    if (target === 'all' || target === 'app') {
      await runMigrationFile(connection, MIGRATION_FILES.app)
    }
    if (target === 'all' || target === 'orders') {
      await runMigrationFile(connection, MIGRATION_FILES.orders)
      const { initMysqlPools } = require('../db/mysql')
      const { seedOrgOrders } = require('../seeds/orgOrdersSeed')
      await initMysqlPools()
      const result = await seedOrgOrders()
      console.log(result.message)
      if (result.organizations?.length) {
        console.log(`机构列表：${result.organizations.join('、')}`)
      }
    }
    console.log('MySQL 建表完成')
  } finally {
    await connection.end()
  }
}

if (require.main === module) {
  initMysql().catch(error => {
    console.error('MySQL 建表失败:', error.message)
    process.exit(1)
  })
}

module.exports = { initMysql, runMigrationFile }
