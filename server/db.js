require('./config/env')

const Database = require('better-sqlite3')
const { usesMysqlOrders, usesSqliteApp } = require('./config/database')
const bcrypt = require('bcryptjs')
const path = require('path')
const fs = require('fs')

const ALERT_LEVELS = ['blue', 'yellow', 'orange', 'red']
const STATUSES = ['planned', 'active', 'ended']

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = usesSqliteApp()
  ? new Database(path.join(dataDir, 'rehot.db'))
  : null

if (db) {
  db.pragma('journal_mode = WAL')
}

const DEFAULT_HEAT_WAVES = [
  {
    name: '华东持续高温',
    region: '华东',
    city: '上海',
    max_temperature: 39.5,
    alert_level: 'orange',
    status: 'active',
    start_date: '2026-06-10',
    end_date: '',
    description: '副热带高压控制，中心城区最高气温突破39℃'
  },
  {
    name: '华北干热天气',
    region: '华北',
    city: '北京',
    max_temperature: 38.2,
    alert_level: 'yellow',
    status: 'active',
    start_date: '2026-06-08',
    end_date: '',
    description: '晴热少雨，体感温度较高，注意防暑降温'
  },
  {
    name: '华南闷热天气',
    region: '华南',
    city: '广州',
    max_temperature: 36.8,
    alert_level: 'yellow',
    status: 'active',
    start_date: '2026-06-09',
    end_date: '',
    description: '湿度偏大，闷热感明显'
  },
  {
    name: '西北高温过程',
    region: '西北',
    city: '西安',
    max_temperature: 41.0,
    alert_level: 'red',
    status: 'ended',
    start_date: '2026-06-01',
    end_date: '2026-06-07',
    description: '干热型高温，已结束'
  },
  {
    name: '西南局地高温',
    region: '西南',
    city: '重庆',
    max_temperature: 37.6,
    alert_level: 'orange',
    status: 'planned',
    start_date: '2026-06-15',
    end_date: '',
    description: '预报未来一周将出现持续高温天气'
  }
]

const DEFAULT_PERMISSIONS = [
  { name: '查看热浪', code: 'heat_wave:view', description: '查看热浪事件列表与详情' },
  { name: '管理热浪', code: 'heat_wave:manage', description: '新增、编辑、删除热浪事件' },
  { name: '查看用户', code: 'system:user:view', description: '查看系统用户列表' },
  { name: '管理用户', code: 'system:user:manage', description: '新增、编辑、禁用用户' },
  { name: '查看角色', code: 'system:role:view', description: '查看角色与权限配置' },
  { name: '管理角色', code: 'system:role:manage', description: '新增、编辑、删除角色及授权' },
  { name: '查看菜单', code: 'system:menu:view', description: '查看系统菜单' },
  { name: '管理菜单', code: 'system:menu:manage', description: '新增、编辑、删除菜单' },
  { name: '查看直播订单', code: 'tb_order:view', description: '查看直播订单列表与详情' },
  { name: '管理直播订单', code: 'tb_order:manage', description: '新增、编辑、删除及导入直播订单' },
  { name: '查看登录配置', code: 'system:login:view', description: '查看登录页配置' },
  { name: '管理登录配置', code: 'system:login:manage', description: '配置登录页背景图' }
]

const DEFAULT_ROLES = [
  { name: '系统管理员', code: 'admin', description: '拥有全部功能权限' },
  { name: '业务操作员', code: 'operator', description: '负责热浪业务数据维护' },
  { name: '只读用户', code: 'viewer', description: '仅可查看业务数据' }
]

const OPERATOR_PERMISSIONS = ['heat_wave:view', 'heat_wave:manage', 'tb_order:view', 'tb_order:manage']
const VIEWER_PERMISSIONS = ['heat_wave:view', 'tb_order:view']

function mapSysTbOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    bizOrderId: row.biz_order_id,
    parentOrderId: row.parent_order_id || '',
    sellerNick: row.seller_nick || '',
    itemTitle: row.item_title || '',
    itemId: row.item_id || '',
    adUserNick: row.ad_user_nick || '',
    agencyNick: row.agency_nick || '',
    orderStatus: row.order_status || '',
    orderPaidTime: row.order_paid_time || '',
    orderAmount: row.order_amount || '',
    predictAmount: row.predict_amount || '',
    orderCommissionAmount: row.order_commission_amount || '',
    sellerCommissionRatio: row.seller_commission_ratio || '',
    remark: row.remark || '',
    refundAmount: row.refund_amount || '',
    predictTotalAmount: row.predict_total_amount || '',
    buyAmount: row.buy_amount,
    createBy: row.create_by || '',
    createTime: row.create_time || '',
    updateBy: row.update_by || '',
    updateTime: row.update_time || '',
    loginUserName: row.login_user_name || '',
    userFlow: row.user_flow || ''
  }
}

function mapHeatWave(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    city: row.city,
    maxTemperature: row.max_temperature,
    alertLevel: row.alert_level,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date || '',
    description: row.description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function ensureUserColumns() {
  const columns = db.prepare('PRAGMA table_info(users)').all()
  const names = columns.map(col => col.name)

  if (!names.includes('display_name')) {
    db.exec("ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT ''")
  }
  if (!names.includes('status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'enabled'")
  }
  if (!names.includes('role_id')) {
    db.exec('ALTER TABLE users ADD COLUMN role_id INTEGER')
  }
  if (!names.includes('updated_at')) {
    db.exec('ALTER TABLE users ADD COLUMN updated_at TEXT')
    db.exec("UPDATE users SET updated_at = datetime('now') WHERE updated_at IS NULL")
  }
}

function seedPermissions() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO permissions (name, code, description)
    VALUES (@name, @code, @description)
  `)
  DEFAULT_PERMISSIONS.forEach(item => insert.run(item))
}

function seedRoles() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO roles (name, code, description)
    VALUES (@name, @code, @description)
  `)
  DEFAULT_ROLES.forEach(item => insert.run(item))

  const allPermissionIds = db.prepare('SELECT id, code FROM permissions').all()
  const roleRows = db.prepare('SELECT id, code FROM roles').all()
  const roleMap = Object.fromEntries(roleRows.map(row => [row.code, row.id]))

  const link = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    VALUES (?, ?)
  `)

  allPermissionIds.forEach(perm => {
    link.run(roleMap.admin, perm.id)
  })

  OPERATOR_PERMISSIONS.forEach(code => {
    const perm = allPermissionIds.find(item => item.code === code)
    if (perm) link.run(roleMap.operator, perm.id)
  })

  VIEWER_PERMISSIONS.forEach(code => {
    const perm = allPermissionIds.find(item => item.code === code)
    if (perm) link.run(roleMap.viewer, perm.id)
  })
}

function seedMenus() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM menus').get().count
  if (count > 0) return

  const business = db.prepare(`
    INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
    VALUES (0, '业务管理', '', 'el-icon-s-grid', '', 1, 1)
  `).run()

  const system = db.prepare(`
    INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
    VALUES (0, '系统管理', '', 'el-icon-setting', '', 2, 1)
  `).run()

  const children = [
    { parent_id: business.lastInsertRowid, title: '直播数据总览', path: '/admin/live-overview', icon: 'el-icon-data-analysis', permission_code: 'tb_order:view', sort_order: 1 },
    { parent_id: system.lastInsertRowid, title: '用户管理', path: '/admin/users', icon: 'el-icon-user', permission_code: 'system:user:view', sort_order: 1 },
    { parent_id: system.lastInsertRowid, title: '角色权限', path: '/admin/roles', icon: 'el-icon-key', permission_code: 'system:role:view', sort_order: 2 },
    { parent_id: system.lastInsertRowid, title: '菜单管理', path: '/admin/menus', icon: 'el-icon-menu', permission_code: 'system:menu:view', sort_order: 3 }
  ]

  const insert = db.prepare(`
    INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
    VALUES (@parent_id, @title, @path, @icon, @permission_code, @sort_order, 1)
  `)
  children.forEach(item => insert.run(item))
}

function migrateLiveMenus() {
  db.prepare("DELETE FROM menus WHERE path = '/admin/heat-waves'").run()

  const business = db.prepare(`
    SELECT id FROM menus WHERE title = '业务管理' AND parent_id = 0 LIMIT 1
  `).get()
  if (!business) return

  const overview = db.prepare("SELECT id FROM menus WHERE path = '/admin/live-overview'").get()
  if (!overview) {
    db.prepare(`
      INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
      VALUES (?, '直播数据总览', '/admin/live-overview', 'el-icon-data-analysis', 'tb_order:view', 1, 1)
    `).run(business.id)
  } else {
    db.prepare(`
      UPDATE menus
      SET title = '直播数据总览', icon = 'el-icon-data-analysis', permission_code = 'tb_order:view', sort_order = 1, enabled = 1
      WHERE path = '/admin/live-overview'
    `).run()
  }
}

function seedTbOrderMenu() {
  migrateLiveMenus()

  const existing = db.prepare("SELECT id FROM menus WHERE path = '/admin/tb-orders'").get()
  if (existing) {
    db.prepare(`
      UPDATE menus SET sort_order = 2 WHERE path = '/admin/tb-orders'
    `).run()
    return
  }

  const business = db.prepare(`
    SELECT id FROM menus WHERE title = '业务管理' AND parent_id = 0 LIMIT 1
  `).get()
  if (!business) return

  db.prepare(`
    INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
    VALUES (?, '直播订单管理', '/admin/tb-orders', 'el-icon-s-order', 'tb_order:view', 2, 1)
  `).run(business.id)

  const adminRole = db.prepare("SELECT id FROM roles WHERE code = 'admin'").get()
  const operatorRole = db.prepare("SELECT id FROM roles WHERE code = 'operator'").get()
  const viewerRole = db.prepare("SELECT id FROM roles WHERE code = 'viewer'").get()
  const link = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    VALUES (?, ?)
  `)

  const tbPerms = db.prepare(`
    SELECT id, code FROM permissions WHERE code IN ('tb_order:view', 'tb_order:manage')
  `).all()

  tbPerms.forEach(perm => {
    if (adminRole) link.run(adminRole.id, perm.id)
    if (operatorRole && ['tb_order:view', 'tb_order:manage'].includes(perm.code)) {
      link.run(operatorRole.id, perm.id)
    }
    if (viewerRole && perm.code === 'tb_order:view') link.run(viewerRole.id, perm.id)
  })
}

function migrateOrgOverviewMenus() {
  db.prepare(`
    UPDATE menus
    SET title = '联奇文化数据',
        path = '/admin/org-overview?org=联奇文化',
        icon = 'el-icon-data-line',
        permission_code = 'tb_order:view',
        sort_order = 3,
        enabled = 1
    WHERE path = '/admin/dev-lianqi-overview'
  `).run()

  const existing = db.prepare("SELECT id FROM menus WHERE path = '/admin/org-overview?org=联奇文化'").get()
  if (existing) return

  const legacy = db.prepare("SELECT id FROM menus WHERE path = '/admin/dev-lianqi-overview'").get()
  if (legacy) return

  const business = db.prepare(`
    SELECT id FROM menus WHERE title = '业务管理' AND parent_id = 0 LIMIT 1
  `).get()
  if (!business) return

  db.prepare(`
    INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
    VALUES (?, '联奇文化数据', '/admin/org-overview?org=联奇文化', 'el-icon-data-line', 'tb_order:view', 3, 1)
  `).run(business.id)
}

function seedLoginConfigMenu() {
  const existing = db.prepare("SELECT id FROM menus WHERE path = '/admin/login-config'").get()
  if (existing) return

  const system = db.prepare(`
    SELECT id FROM menus WHERE title = '系统管理' AND parent_id = 0 LIMIT 1
  `).get()
  if (!system) return

  db.prepare(`
    INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
    VALUES (?, '登录页配置', '/admin/login-config', 'el-icon-picture-outline', 'system:login:view', 4, 1)
  `).run(system.id)

  const adminRole = db.prepare("SELECT id FROM roles WHERE code = 'admin'").get()
  const link = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    VALUES (?, ?)
  `)
  const loginPerms = db.prepare(`
    SELECT id FROM permissions WHERE code IN ('system:login:view', 'system:login:manage')
  `).all()
  loginPerms.forEach(perm => {
    if (adminRole) link.run(adminRole.id, perm.id)
  })
}

function seedDemoTbOrders() {
  if (usesMysqlOrders()) return

  const count = db.prepare('SELECT COUNT(*) AS count FROM sys_tb_order').get().count
  if (count >= 3) return

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const today = `${yyyy}-${mm}-${dd}`

  const demo = [
    {
      biz_order_id: 'DEMO-001',
      parent_order_id: 'PARENT-001',
      seller_nick: '热浪旗舰店',
      item_title: '夏季防晒喷雾',
      item_id: 'SKU-1001',
      ad_user_nick: '达人小美',
      agency_nick: '星火机构',
      order_status: '定期已支付',
      order_paid_time: `${today} 10:30:00`,
      order_amount: '299.00',
      predict_amount: '29.90',
      order_commission_amount: '299.00',
      seller_commission_ratio: '10%',
      remark: '',
      refund_amount: '0',
      predict_total_amount: '299.00',
      buy_amount: 1,
      login_user_name: '星火机构',
      user_flow: '直播推荐'
    },
    {
      biz_order_id: 'DEMO-002',
      parent_order_id: 'PARENT-002',
      seller_nick: '热浪旗舰店',
      item_title: '便携小风扇',
      item_id: 'SKU-1002',
      ad_user_nick: '达人阿杰',
      agency_nick: '蓝海机构',
      order_status: '订单已确认收货',
      order_paid_time: `${today} 09:15:00`,
      order_amount: '159.50',
      predict_amount: '15.95',
      order_commission_amount: '159.50',
      seller_commission_ratio: '10%',
      remark: '',
      refund_amount: '0',
      predict_total_amount: '159.50',
      buy_amount: 2,
      login_user_name: '蓝海机构',
      user_flow: '短视频引流'
    },
    {
      biz_order_id: 'DEMO-003',
      parent_order_id: 'PARENT-003',
      seller_nick: '清凉好物店',
      item_title: '冰感毛巾',
      item_id: 'SKU-2001',
      ad_user_nick: '达人小美',
      agency_nick: '星火机构',
      order_status: '订单售中退款关闭',
      order_paid_time: `${today} 14:20:00`,
      order_amount: '89.00',
      predict_amount: '8.90',
      order_commission_amount: '89.00',
      seller_commission_ratio: '10%',
      remark: '用户退款',
      refund_amount: '89.00',
      predict_total_amount: '89.00',
      buy_amount: 1,
      login_user_name: '星火机构',
      user_flow: '直播推荐'
    }
  ]

  const insert = db.prepare(`
    INSERT OR IGNORE INTO sys_tb_order (
      biz_order_id, parent_order_id, seller_nick, item_title, item_id,
      ad_user_nick, agency_nick, order_status, order_paid_time, order_amount,
      predict_amount, order_commission_amount, seller_commission_ratio, remark,
      refund_amount, predict_total_amount, buy_amount, login_user_name, user_flow,
      create_time, update_time
    ) VALUES (
      @biz_order_id, @parent_order_id, @seller_nick, @item_title, @item_id,
      @ad_user_nick, @agency_nick, @order_status, @order_paid_time, @order_amount,
      @predict_amount, @order_commission_amount, @seller_commission_ratio, @remark,
      @refund_amount, @predict_total_amount, @buy_amount, @login_user_name, @user_flow,
      datetime('now'), datetime('now')
    )
  `)
  demo.forEach(item => insert.run(item))
}

function seedUsers() {
  const adminRole = db.prepare("SELECT id FROM roles WHERE code = 'admin'").get()
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count

  if (userCount === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10)
    db.prepare(`
      INSERT INTO users (username, password_hash, display_name, status, role_id)
      VALUES (?, ?, ?, 'enabled', ?)
    `).run('admin', passwordHash, '系统管理员', adminRole?.id || null)
    return
  }

  db.prepare(`
    UPDATE users
    SET role_id = ?, display_name = COALESCE(NULLIF(display_name, ''), '系统管理员')
    WHERE username = 'admin' AND (role_id IS NULL OR role_id = '')
  `).run(adminRole?.id || null)
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      status TEXT DEFAULT 'enabled',
      role_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      path TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      permission_code TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS heat_waves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      city TEXT NOT NULL,
      max_temperature REAL NOT NULL,
      alert_level TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sys_tb_order (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      biz_order_id TEXT NOT NULL,
      parent_order_id TEXT,
      seller_nick TEXT,
      item_title TEXT,
      item_id TEXT,
      ad_user_nick TEXT,
      agency_nick TEXT,
      order_status TEXT,
      order_paid_time TEXT,
      order_amount TEXT,
      predict_amount TEXT,
      order_commission_amount TEXT,
      seller_commission_ratio TEXT,
      remark TEXT,
      refund_amount TEXT,
      predict_total_amount TEXT,
      buy_amount INTEGER,
      create_by TEXT,
      create_time TEXT,
      update_by TEXT,
      update_time TEXT,
      login_user_name TEXT,
      user_flow TEXT
    );

    CREATE INDEX IF NOT EXISTS sys_tb_order_order_paid_time_IDX
      ON sys_tb_order (order_paid_time, item_title);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  ensureUserColumns()
  seedPermissions()
  seedRoles()
  seedMenus()
  seedTbOrderMenu()
  migrateOrgOverviewMenus()
  seedLoginConfigMenu()
  seedUsers()
  seedDemoTbOrders()

  const heatWaveCount = db.prepare('SELECT COUNT(*) AS count FROM heat_waves').get().count
  if (heatWaveCount === 0) {
    const insert = db.prepare(`
      INSERT INTO heat_waves (
        name, region, city, max_temperature, alert_level, status, start_date, end_date, description
      ) VALUES (
        @name, @region, @city, @max_temperature, @alert_level, @status, @start_date, @end_date, @description
      )
    `)
    const insertMany = db.transaction(items => {
      items.forEach(item => insert.run(item))
    })
    insertMany(DEFAULT_HEAT_WAVES)
  }
}

if (usesSqliteApp()) {
  initDb()
}

module.exports = {
  db,
  mapHeatWave,
  mapSysTbOrder,
  ALERT_LEVELS,
  STATUSES,
  getDatabaseConfig: require('./config/database').getDatabaseConfig,
  usesMysqlOrders,
  usesSqliteApp,
  usesMysqlApp: require('./config/database').usesMysqlApp
}
