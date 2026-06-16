require('./config/env')

const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { getDatabaseConfig, usesMysqlOrders, usesMysqlApp, usesSqliteApp, getOrdersDatabaseName } = require('./config/database')
const { initMysqlPools, pingMysql } = require('./db/mysql')
const { seedMysqlApp } = require('./db/mysqlSeed')

const authRoutes = require('./routes/auth')
const heatWaveRoutes = require('./routes/heatWaves')
const statisticsRoutes = require('./routes/statistics')
const userRoutes = require('./routes/users')
const roleRoutes = require('./routes/roles')
const menuRoutes = require('./routes/menus')
const tbOrderRoutes = require('./routes/tbOrders')
const loginConfigRoutes = require('./routes/loginConfig')
const liveOverviewRoutes = require('./routes/liveOverview')

require('./db')

const uploadsPath = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true })
}

const app = express()
const PORT = process.env.PORT || 3003
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:9090'
const isProduction = process.env.NODE_ENV === 'production'
const distPath = path.join(__dirname, '../dist')
const hasDist = fs.existsSync(path.join(distPath, 'index.html'))

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsPath))

app.get('/api/health', async (req, res) => {
  const dbConfig = getDatabaseConfig()
  let mysql = { enabled: usesMysqlOrders() || usesMysqlApp(), ok: false }

  if (usesMysqlOrders() || usesMysqlApp()) {
    try {
      const ping = await pingMysql()
      mysql = {
        enabled: true,
        ok: ping.ok,
        host: dbConfig.mysql.host,
        port: dbConfig.mysql.port,
        appDatabase: usesMysqlApp() ? dbConfig.mysql.database : null,
        ordersDatabase: usesMysqlOrders()
          ? getOrdersDatabaseName()
          : null,
        app: ping.app || null,
        orders: ping.orders || null
      }
    } catch (error) {
      mysql = {
        enabled: true,
        ok: false,
        message: error.message
      }
    }
  }

  res.json({
    ok: true,
    name: 'REHOT',
    title: '热浪管理程序',
    version: '1.3.0',
    database: {
      driver: dbConfig.driver,
      sqliteApp: usesSqliteApp(),
      mysqlApp: usesMysqlApp(),
      mysqlOrders: usesMysqlOrders(),
      mysql
    },
    features: ['auth', 'heat-waves', 'tb-orders', 'live-overview', 'users', 'roles', 'menus', 'login-config']
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/heat-waves', heatWaveRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/users', userRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/menus', menuRoutes)
app.use('/api/tb-orders', tbOrderRoutes)
app.use('/api/login-config', loginConfigRoutes)
app.use('/api/live-overview', liveOverviewRoutes)

app.use('/api', (req, res) => {
  res.status(404).json({
    message: `接口不存在: ${req.method} ${req.originalUrl}`,
    hint: '请重启后端服务以加载最新 API（npm run dev 或 ./restart-dev.command）'
  })
})

if (isProduction && hasDist) {
  app.use(express.static(distPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else if (!isProduction) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.redirect(`${FRONTEND_URL}${req.originalUrl}`)
  })
}

async function startServer() {
  const dbConfig = getDatabaseConfig()

  if (usesMysqlOrders() || usesMysqlApp()) {
    await initMysqlPools()
    const ping = await pingMysql()
    if (!ping.ok) {
      throw new Error('MySQL 连接失败，请检查 .env 中的 MYSQL_* 配置')
    }
  }

  if (usesMysqlApp()) {
    await seedMysqlApp()
  }

  console.log(`Database driver: ${dbConfig.driver}`)
  if (usesSqliteApp()) {
    console.log('SQLite app database: server/data/rehot.db')
  }
  if (usesMysqlApp()) {
    console.log(`MySQL app database: ${dbConfig.mysql.database}`)
  }
  if (usesMysqlOrders()) {
    console.log(`MySQL orders database: ${getOrdersDatabaseName()}`)
  }

  app.listen(PORT, () => {
    console.log(`REHOT API server running at http://localhost:${PORT}`)
    if (isProduction && hasDist) {
      console.log(`Web UI served at http://localhost:${PORT}`)
    } else if (!isProduction) {
      console.log(`Web UI (dev): ${FRONTEND_URL} — use "npm run dev" to start frontend + API`)
    } else {
      console.log('Run "npm run build" first to serve the web UI from this port')
    }
    console.log('Default admin account: admin / admin123')
  })
}

startServer().catch(error => {
  console.error('服务启动失败:', error.message)
  process.exit(1)
})
