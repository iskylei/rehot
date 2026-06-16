<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="admin-aside">
      <div class="admin-logo">
        <div class="admin-logo__en">REHOT</div>
        <div class="admin-logo__cn">热浪管理程序</div>
      </div>
      <el-menu
        :default-active="activeMenu"
        :default-openeds="defaultOpeneds"
        router
        background-color="#ecf5ff"
        text-color="#303133"
        active-text-color="#409EFF"
      >
        <template v-for="menu in menus">
          <el-submenu v-if="menu.children && menu.children.length" :key="`group-${menu.id}`" :index="`group-${menu.id}`">
            <template slot="title">
              <i v-if="menu.icon" :class="menu.icon" />
              <span>{{ menu.title }}</span>
            </template>
            <el-menu-item
              v-for="child in menu.children"
              :key="child.id"
              :index="child.path"
            >
              <i v-if="child.icon" :class="child.icon" />
              <span slot="title">{{ child.title }}</span>
            </el-menu-item>
          </el-submenu>
          <el-menu-item v-else-if="menu.path" :key="`item-${menu.id}`" :index="menu.path">
            <i v-if="menu.icon" :class="menu.icon" />
            <span slot="title">{{ menu.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="admin-header">
        <div class="admin-header__left">热浪管理后台</div>
        <div class="admin-header__right">
          <span class="admin-user">{{ displayName }}</span>
          <el-tag size="mini" type="danger">{{ roleName }}</el-tag>
          <el-button type="text" @click="openPasswordDialog">修改密码</el-button>
          <el-button type="text" @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>

    <el-dialog
      title="修改密码"
      :visible.sync="passwordDialogVisible"
      width="460px"
      @closed="resetPasswordForm"
    >
      <el-form
        ref="passwordForm"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
        @submit.native.prevent
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            show-password
            placeholder="请输入原密码"
            autocomplete="current-password"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
            placeholder="至少 6 位"
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
            autocomplete="new-password"
            @keyup.enter.native="handleChangePassword"
          />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="passwordSaving" @click="handleChangePassword">
          保存
        </el-button>
      </span>
    </el-dialog>
  </el-container>
</template>

<script>
import { fetchCurrentUser, changePassword } from '@/api/auth'
import { getUser, clearAuth, setAuth, getMenus, authState } from '@/utils/auth'
import { normalizeAdminPath } from '@/utils/menu'

const emptyPasswordForm = () => ({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

export default {
  name: 'AdminLayout',
  data() {
    const validateConfirmPassword = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请再次输入新密码'))
        return
      }
      if (value !== this.passwordForm.newPassword) {
        callback(new Error('两次输入的新密码不一致'))
        return
      }
      callback()
    }

    return {
      passwordDialogVisible: false,
      passwordSaving: false,
      passwordForm: emptyPasswordForm(),
      passwordRules: {
        oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '新密码长度不能少于 6 位', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, validator: validateConfirmPassword, trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    activeMenu() {
      return this.$route.path
    },
    menus() {
      const source = authState.menus.length ? authState.menus : getMenus()
      return source.map(menu => {
        if (!menu.children?.length) {
          const path = normalizeAdminPath(menu.path)
          return path ? { ...menu, path } : null
        }
        const children = menu.children
          .map(child => {
            const path = normalizeAdminPath(child.path)
            return path ? { ...child, path } : null
          })
          .filter(Boolean)
        return children.length ? { ...menu, children } : null
      }).filter(Boolean)
    },
    defaultOpeneds() {
      return this.menus
        .filter(menu => menu.children && menu.children.length)
        .map(menu => `group-${menu.id}`)
    },
    user() {
      return getUser() || {}
    },
    displayName() {
      return this.user.displayName || this.user.username || '管理员'
    },
    roleName() {
      return this.user.roleName || '未分配角色'
    }
  },
  created() {
    this.refreshSession()
  },
  methods: {
    async refreshSession() {
      try {
        const res = await fetchCurrentUser()
        const token = localStorage.getItem('rehot_auth_token')
        setAuth(token, res.user, res.permissions || [], res.menus || [])
      } catch (error) {
        // 401 会由 request 拦截器处理
      }
    },
    handleLogout() {
      clearAuth()
      this.$router.replace('/login')
    },
    openPasswordDialog() {
      this.passwordDialogVisible = true
    },
    resetPasswordForm() {
      this.passwordForm = emptyPasswordForm()
      this.$nextTick(() => {
        this.$refs.passwordForm?.clearValidate()
      })
    },
    handleChangePassword() {
      this.$refs.passwordForm.validate(async valid => {
        if (!valid) return

        this.passwordSaving = true
        try {
          await changePassword({
            oldPassword: this.passwordForm.oldPassword,
            newPassword: this.passwordForm.newPassword
          })
          this.$message.success('密码修改成功，请重新登录')
          this.passwordDialogVisible = false
          clearAuth()
          this.$router.replace('/login')
        } catch (error) {
          this.$message.error(error.message)
        } finally {
          this.passwordSaving = false
        }
      })
    }
  }
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.admin-aside {
  background: #ecf5ff;
  border-right: 1px solid #d9ecff;
}

.admin-logo {
  color: #303133;
  padding: 20px 16px;
  border-bottom: 1px solid #d9ecff;
}

.admin-logo__en {
  font-size: 20px;
  font-weight: 700;
}

.admin-logo__cn {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.admin-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-user {
  color: #606266;
}

.admin-main {
  background: #f5f7fa;
}
</style>
