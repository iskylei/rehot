const bcrypt = require('bcryptjs')
const appStore = require('../services/appStore')

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

async function seedPermissions() {
  for (const item of DEFAULT_PERMISSIONS) {
    await appStore.insertIgnore(
      'INSERT OR IGNORE INTO permissions (name, code, description) VALUES (?, ?, ?)',
      'INSERT IGNORE INTO permissions (name, code, description) VALUES (?, ?, ?)',
      [item.name, item.code, item.description]
    )
  }
}

async function seedRoles() {
  for (const item of DEFAULT_ROLES) {
    await appStore.insertIgnore(
      'INSERT OR IGNORE INTO roles (name, code, description) VALUES (?, ?, ?)',
      'INSERT IGNORE INTO roles (name, code, description) VALUES (?, ?, ?)',
      [item.name, item.code, item.description]
    )
  }

  const allPermissionIds = await appStore.queryAll('SELECT id, code FROM permissions')
  const roleRows = await appStore.queryAll('SELECT id, code FROM roles')
  const roleMap = Object.fromEntries(roleRows.map(row => [row.code, row.id]))

  for (const perm of allPermissionIds) {
    await appStore.insertIgnore(
      'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [roleMap.admin, perm.id]
    )
  }

  for (const code of OPERATOR_PERMISSIONS) {
    const perm = allPermissionIds.find(item => item.code === code)
    if (perm) {
      await appStore.insertIgnore(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleMap.operator, perm.id]
      )
    }
  }

  for (const code of VIEWER_PERMISSIONS) {
    const perm = allPermissionIds.find(item => item.code === code)
    if (perm) {
      await appStore.insertIgnore(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleMap.viewer, perm.id]
      )
    }
  }
}

async function seedMenus() {
  const countRow = await appStore.queryOne('SELECT COUNT(*) AS count FROM menus')
  if (Number(countRow?.count) > 0) return

  const business = await appStore.execute(
    `INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
     VALUES (0, '业务管理', '', 'el-icon-s-grid', '', 1, 1)`
  )
  const system = await appStore.execute(
    `INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
     VALUES (0, '系统管理', '', 'el-icon-setting', '', 2, 1)`
  )
  const businessId = appStore.getLastInsertId(business)
  const systemId = appStore.getLastInsertId(system)

  const children = [
    { parent_id: businessId, title: '直播数据总览', path: '/admin/live-overview', icon: 'el-icon-data-analysis', permission_code: 'tb_order:view', sort_order: 1 },
    { parent_id: systemId, title: '用户管理', path: '/admin/users', icon: 'el-icon-user', permission_code: 'system:user:view', sort_order: 1 },
    { parent_id: systemId, title: '角色权限', path: '/admin/roles', icon: 'el-icon-key', permission_code: 'system:role:view', sort_order: 2 },
    { parent_id: systemId, title: '菜单管理', path: '/admin/menus', icon: 'el-icon-menu', permission_code: 'system:menu:view', sort_order: 3 }
  ]

  for (const item of children) {
    await appStore.execute(
      `INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [item.parent_id, item.title, item.path, item.icon, item.permission_code, item.sort_order]
    )
  }
}

async function migrateLiveMenus() {
  await appStore.execute("DELETE FROM menus WHERE path = '/admin/heat-waves'")

  const business = await appStore.queryOne(`
    SELECT id FROM menus WHERE title = '业务管理' AND parent_id = 0 LIMIT 1
  `)
  if (!business) return

  const overview = await appStore.queryOne("SELECT id FROM menus WHERE path = '/admin/live-overview'")
  if (!overview) {
    await appStore.execute(
      `INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
       VALUES (?, '直播数据总览', '/admin/live-overview', 'el-icon-data-analysis', 'tb_order:view', 1, 1)`,
      [business.id]
    )
  } else {
    await appStore.execute(
      `UPDATE menus
       SET title = '直播数据总览', icon = 'el-icon-data-analysis', permission_code = 'tb_order:view', sort_order = 1, enabled = 1
       WHERE path = '/admin/live-overview'`
    )
  }
}

async function seedTbOrderMenu() {
  await migrateLiveMenus()

  const existing = await appStore.queryOne("SELECT id FROM menus WHERE path = '/admin/tb-orders'")
  if (existing) {
    await appStore.execute("UPDATE menus SET sort_order = 2 WHERE path = '/admin/tb-orders'")
    return
  }

  const business = await appStore.queryOne(`
    SELECT id FROM menus WHERE title = '业务管理' AND parent_id = 0 LIMIT 1
  `)
  if (!business) return

  await appStore.execute(
    `INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
     VALUES (?, '直播订单管理', '/admin/tb-orders', 'el-icon-s-order', 'tb_order:view', 2, 1)`,
    [business.id]
  )

  const adminRole = await appStore.queryOne("SELECT id FROM roles WHERE code = 'admin'")
  const operatorRole = await appStore.queryOne("SELECT id FROM roles WHERE code = 'operator'")
  const viewerRole = await appStore.queryOne("SELECT id FROM roles WHERE code = 'viewer'")
  const tbPerms = await appStore.queryAll(`
    SELECT id, code FROM permissions WHERE code IN ('tb_order:view', 'tb_order:manage')
  `)

  for (const perm of tbPerms) {
    if (adminRole) {
      await appStore.insertIgnore(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [adminRole.id, perm.id]
      )
    }
    if (operatorRole && ['tb_order:view', 'tb_order:manage'].includes(perm.code)) {
      await appStore.insertIgnore(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [operatorRole.id, perm.id]
      )
    }
    if (viewerRole && perm.code === 'tb_order:view') {
      await appStore.insertIgnore(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [viewerRole.id, perm.id]
      )
    }
  }
}

async function migrateOrgOverviewMenus() {
  const orgMenus = [
    { title: '联奇文化数据', org: '联奇文化', sortOrder: 3 },
    { title: '柳风文化数据', org: '柳风文化', sortOrder: 4 }
  ]
  const removedMenuPaths = [
    '/admin/org-overview?org=星火机构',
    '/admin/org-overview?org=蓝海机构'
  ]

  for (const path of removedMenuPaths) {
    await appStore.execute('DELETE FROM menus WHERE path = ?', [path])
  }

  await appStore.execute(`
    UPDATE menus
    SET title = '联奇文化数据',
        path = '/admin/org-overview?org=联奇文化',
        icon = 'el-icon-data-line',
        permission_code = 'tb_order:view',
        sort_order = 3,
        enabled = 1
    WHERE path = '/admin/dev-lianqi-overview'
  `)

  const business = await appStore.queryOne(`
    SELECT id FROM menus WHERE title = '业务管理' AND parent_id = 0 LIMIT 1
  `)
  if (!business) return

  for (const menu of orgMenus) {
    const path = `/admin/org-overview?org=${menu.org}`
    const existing = await appStore.queryOne('SELECT id FROM menus WHERE path = ?', [path])
    if (existing) {
      await appStore.execute(`
        UPDATE menus
        SET title = ?, icon = 'el-icon-data-line', permission_code = 'tb_order:view',
            sort_order = ?, enabled = 1
        WHERE path = ?
      `, [menu.title, menu.sortOrder, path])
      continue
    }

    await appStore.execute(
      `INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
       VALUES (?, ?, ?, 'el-icon-data-line', 'tb_order:view', ?, 1)`,
      [business.id, menu.title, path, menu.sortOrder]
    )
  }
}

async function seedLoginConfigMenu() {
  const existing = await appStore.queryOne("SELECT id FROM menus WHERE path = '/admin/login-config'")
  if (existing) return

  const system = await appStore.queryOne(`
    SELECT id FROM menus WHERE title = '系统管理' AND parent_id = 0 LIMIT 1
  `)
  if (!system) return

  await appStore.execute(
    `INSERT INTO menus (parent_id, title, path, icon, permission_code, sort_order, enabled)
     VALUES (?, '登录页配置', '/admin/login-config', 'el-icon-picture-outline', 'system:login:view', 4, 1)`,
    [system.id]
  )

  const adminRole = await appStore.queryOne("SELECT id FROM roles WHERE code = 'admin'")
  const loginPerms = await appStore.queryAll(`
    SELECT id FROM permissions WHERE code IN ('system:login:view', 'system:login:manage')
  `)

  for (const perm of loginPerms) {
    if (adminRole) {
      await appStore.insertIgnore(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [adminRole.id, perm.id]
      )
    }
  }
}

async function seedUsers() {
  const adminRole = await appStore.queryOne("SELECT id FROM roles WHERE code = 'admin'")
  const userCountRow = await appStore.queryOne('SELECT COUNT(*) AS count FROM users')
  const userCount = Number(userCountRow?.count) || 0

  if (userCount === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10)
    await appStore.execute(
      `INSERT INTO users (username, password_hash, display_name, status, role_id)
       VALUES (?, ?, ?, 'enabled', ?)`,
      ['admin', passwordHash, '系统管理员', adminRole?.id || null]
    )
    return
  }

  await appStore.execute(
    `UPDATE users
     SET role_id = ?, display_name = COALESCE(NULLIF(display_name, ''), '系统管理员')
     WHERE username = 'admin' AND (role_id IS NULL OR role_id = 0)`,
    [adminRole?.id || null]
  )
}

async function seedHeatWaves() {
  const countRow = await appStore.queryOne('SELECT COUNT(*) AS count FROM heat_waves')
  if (Number(countRow?.count) > 0) return

  for (const item of DEFAULT_HEAT_WAVES) {
    await appStore.execute(
      `INSERT INTO heat_waves (
        name, region, city, max_temperature, alert_level, status, start_date, end_date, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.name,
        item.region,
        item.city,
        item.max_temperature,
        item.alert_level,
        item.status,
        item.start_date,
        item.end_date,
        item.description
      ]
    )
  }
}

async function seedMysqlApp() {
  await seedPermissions()
  await seedRoles()
  await seedMenus()
  await seedTbOrderMenu()
  await migrateOrgOverviewMenus()
  await seedLoginConfigMenu()
  await seedUsers()
  await seedHeatWaves()
}

module.exports = {
  seedMysqlApp
}
