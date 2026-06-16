<template>
  <div class="login-page" :style="pageStyle">
    <el-card class="login-card" shadow="hover">
      <div class="login-title">REHOT 登录</div>
      <div class="login-subtitle">热浪管理程序 · 后台管理</div>
      <el-form ref="form" :model="form" :rules="rules" @submit.native.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" prefix-icon="el-icon-user" placeholder="用户名" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            prefix-icon="el-icon-lock"
            type="password"
            placeholder="密码"
            show-password
            @keyup.enter.native="handleLogin"
          />
        </el-form-item>
        <el-button type="danger" class="login-btn" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { login, fetchCurrentUser } from '@/api/auth'
import { fetchLoginConfig } from '@/api/loginConfig'
import { setAuth } from '@/utils/auth'
import { findFirstMenuPath, canAccessPath } from '@/utils/menu'

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #922b21 0%, #641e16 100%)'

export default {
  name: 'LoginPage',
  data() {
    return {
      loading: false,
      loginConfig: {
        backgroundType: 'gradient',
        backgroundImage: '',
        backgroundGradient: DEFAULT_GRADIENT,
        overlayOpacity: 0.15
      },
      form: {
        username: '',
        password: ''
      },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    }
  },
  computed: {
    pageStyle() {
      const opacity = this.loginConfig.overlayOpacity ?? 0.15
      if (this.loginConfig.backgroundType === 'image' && this.loginConfig.backgroundImage) {
        return {
          backgroundImage: `linear-gradient(rgba(0,0,0,${opacity}), rgba(0,0,0,${opacity})), url(${this.loginConfig.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }
      }
      return {
        background: this.loginConfig.backgroundGradient || DEFAULT_GRADIENT
      }
    }
  },
  created() {
    this.loadLoginConfig()
  },
  methods: {
    async loadLoginConfig() {
      try {
        const res = await fetchLoginConfig()
        if (res.config) {
          this.loginConfig = {
            ...this.loginConfig,
            ...res.config
          }
        }
      } catch (error) {
        // 使用默认背景，不打断登录
      }
    },
    handleLogin() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.loading = true
        try {
          const res = await login(this.form)
          let permissions = res.permissions || []
          let menus = res.menus || []
          let user = res.user

          if (!permissions.length || !menus.length) {
            setAuth(res.token, user, permissions, menus)
            const me = await fetchCurrentUser()
            user = me.user
            permissions = me.permissions || []
            menus = me.menus || []
          }

          setAuth(res.token, user, permissions, menus)

          const queryRedirect = this.$route.query.redirect
          const defaultPath = findFirstMenuPath(menus, permissions)
          let redirect = defaultPath

          if (queryRedirect && queryRedirect.startsWith('/admin/')) {
            if (canAccessPath(queryRedirect, menus, permissions)) {
              redirect = queryRedirect
            }
          }

          if (!redirect) {
            if (!permissions.length && !menus.length) {
              this.$message.error('后端服务未加载权限模块，请双击运行 restart-dev.command 重启后再登录')
            } else {
              this.$message.error('当前账号没有可访问的菜单权限，请联系管理员')
            }
            return
          }

          this.$message.success('登录成功')
          await this.$router.replace(redirect)
        } catch (error) {
          this.$message.error(error.message)
        } finally {
          this.loading = false
        }
      })
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
}

.login-card {
  width: 400px;
  padding: 8px 4px 12px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.login-card ::v-deep .el-card__body {
  background: transparent;
}

.login-title {
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: #c0392b;
  margin-bottom: 8px;
}

.login-subtitle {
  text-align: center;
  font-size: 13px;
  color: #909399;
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
}
</style>
