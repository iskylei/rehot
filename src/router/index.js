import Vue from 'vue'
import VueRouter from 'vue-router'
import {
  isLoggedIn,
  hasPermission,
  getMenus,
  getPermissions,
  clearAuth
} from '@/utils/auth'
import {
  findFirstMenuPath,
  getRoutePermission,
  normalizeAdminPath,
  canAccessOrgRoute,
  getAdminPathname,
  VALID_ADMIN_PATHS
} from '@/utils/menu'
import { Message } from 'element-ui'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/admin',
    component: () => import('../views/admin/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/admin/live-overview',
    children: [
      {
        path: 'heat-waves',
        redirect: '/admin/live-overview'
      },
      {
        path: 'live-overview',
        name: 'LiveOverview',
        component: () => import('../views/admin/LiveOverview.vue'),
        meta: { requiresAuth: true, title: '直播数据总览', permission: 'tb_order:view' }
      },
      {
        path: 'org-overview',
        name: 'OrgOverview',
        component: () => import('../views/admin/OrgOverview.vue'),
        meta: { requiresAuth: true, title: '机构数据总览', orgRoute: true }
      },
      {
        path: 'tb-orders',
        name: 'TbOrderList',
        component: () => import('../views/admin/TbOrderList.vue'),
        meta: { requiresAuth: true, title: '直播订单管理', permission: 'tb_order:view' }
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('../views/admin/UserList.vue'),
        meta: { requiresAuth: true, title: '用户管理', permission: 'system:user:view' }
      },
      {
        path: 'roles',
        name: 'RoleList',
        component: () => import('../views/admin/RoleList.vue'),
        meta: { requiresAuth: true, title: '角色权限', permission: 'system:role:view' }
      },
      {
        path: 'menus',
        name: 'MenuList',
        component: () => import('../views/admin/MenuList.vue'),
        meta: { requiresAuth: true, title: '菜单管理', permission: 'system:menu:view' }
      },
      {
        path: 'login-config',
        name: 'LoginConfig',
        component: () => import('../views/admin/LoginConfig.vue'),
        meta: { requiresAuth: true, title: '登录页配置', permission: 'system:login:view' }
      }
    ]
  },
  {
    path: '*',
    redirect: to => {
      if (isLoggedIn()) {
        return findFirstMenuPath(getMenus(), getPermissions())
      }
      return '/login'
    }
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

function resolveFallbackPath(excludePath = '') {
  const fallback = findFirstMenuPath(getMenus(), getPermissions())
  const normalized = normalizeAdminPath(fallback)
  if (normalized && normalized !== excludePath) return normalized
  if (VALID_ADMIN_PATHS[0] !== excludePath) return VALID_ADMIN_PATHS[0]
  return '/login'
}

router.beforeEach((to, from, next) => {
  const normalizedTarget = normalizeAdminPath(to.path)

  if (to.meta.public) {
    if (to.path === '/login' && isLoggedIn()) {
      next(resolveFallbackPath('/login'))
      return
    }
    next()
    return
  }

  if (!isLoggedIn()) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.path.startsWith('/admin/') && !normalizedTarget && to.path !== '/admin') {
    next(resolveFallbackPath(to.path))
    return
  }

  if (to.meta.orgRoute || getAdminPathname(to.path) === '/admin/org-overview') {
    const orgName = to.query.org || ''
    if (!canAccessOrgRoute(orgName, getPermissions())) {
      const fallback = resolveFallbackPath(to.fullPath)
      Message.warning('无权限访问该页面')
      if (fallback && fallback !== to.fullPath) {
        next(fallback)
      } else {
        clearAuth()
        next('/login')
      }
      return
    }
    next()
    return
  }

  const requiredPermission = getRoutePermission(to)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    const fallback = resolveFallbackPath(to.fullPath)
    Message.warning('无权限访问该页面')
    if (fallback && fallback !== to.fullPath) {
      next(fallback)
    } else {
      clearAuth()
      next('/login')
    }
    return
  }

  next()
})

const originalPush = VueRouter.prototype.push
const originalReplace = VueRouter.prototype.replace

VueRouter.prototype.push = function push(location, onResolve, onReject) {
  if (onResolve || onReject) {
    return originalPush.call(this, location, onResolve, onReject)
  }
  return originalPush.call(this, location).catch(err => {
    if (err.name !== 'NavigationDuplicated' && !/Redirected/.test(err.message)) {
      return Promise.reject(err)
    }
  })
}

VueRouter.prototype.replace = function replace(location, onResolve, onReject) {
  if (onResolve || onReject) {
    return originalReplace.call(this, location, onResolve, onReject)
  }
  return originalReplace.call(this, location).catch(err => {
    if (err.name !== 'NavigationDuplicated' && !/Redirected/.test(err.message)) {
      return Promise.reject(err)
    }
  })
}

export default router
