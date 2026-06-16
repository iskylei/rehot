<template>
  <div class="login-config-page">
    <el-row :gutter="20">
      <el-col :span="14">
        <el-card shadow="never">
          <div slot="header" class="card-header">登录页配置</div>

          <el-form label-width="110px" size="small">
            <el-form-item label="背景类型">
              <el-radio-group v-model="form.backgroundType" :disabled="!canManage">
                <el-radio label="gradient">渐变色</el-radio>
                <el-radio label="image">背景图片</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="form.backgroundType === 'gradient'" label="渐变样式">
              <el-input
                v-model="form.backgroundGradient"
                :disabled="!canManage"
                placeholder="CSS 渐变，如 linear-gradient(135deg, #922b21 0%, #641e16 100%)"
              />
              <div class="form-tip">支持标准 CSS background 渐变语法</div>
            </el-form-item>

            <el-form-item v-if="form.backgroundType === 'image'" label="背景图片">
              <div class="upload-block">
                <el-upload
                  v-if="canManage"
                  action=""
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  :on-change="handleUpload"
                >
                  <el-button type="primary" plain icon="el-icon-upload2" :loading="uploading">
                    上传背景图
                  </el-button>
                </el-upload>
                <el-button
                  v-if="canManage && form.backgroundImage"
                  type="text"
                  class="danger-text"
                  @click="handleClearImage"
                >
                  清除图片
                </el-button>
              </div>
              <div class="form-tip">支持 JPG / PNG / WEBP / GIF，最大 5MB</div>
              <div v-if="form.backgroundImage" class="image-path">{{ form.backgroundImage }}</div>
            </el-form-item>

            <el-form-item label="遮罩透明度">
              <el-slider
                v-model="form.overlayOpacity"
                :min="0"
                :max="0.8"
                :step="0.05"
                :disabled="!canManage"
                show-input
              />
              <div class="form-tip">背景图上的暗色遮罩，提升登录框可读性</div>
            </el-form-item>

            <el-form-item v-if="canManage">
              <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
              <el-button @click="handleReset">恢复默认</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="never">
          <div slot="header" class="card-header">效果预览</div>
          <div class="preview-box" :style="previewStyle">
            <div class="preview-card">
              <div class="preview-title">REHOT 登录</div>
              <div class="preview-subtitle">热浪管理程序</div>
              <div class="preview-input" />
              <div class="preview-input" />
              <div class="preview-btn">登录</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import {
  fetchLoginConfigAdmin,
  updateLoginConfig,
  uploadLoginBackground,
  clearLoginBackground,
  resetLoginConfig
} from '@/api/loginConfig'
import { hasPermission } from '@/utils/auth'

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #922b21 0%, #641e16 100%)'

export default {
  name: 'LoginConfigPage',
  data() {
    return {
      loading: false,
      saving: false,
      uploading: false,
      form: {
        backgroundType: 'gradient',
        backgroundImage: '',
        backgroundGradient: DEFAULT_GRADIENT,
        overlayOpacity: 0.15
      }
    }
  },
  computed: {
    canManage() {
      return hasPermission('system:login:manage')
    },
    previewStyle() {
      const opacity = this.form.overlayOpacity ?? 0.15
      if (this.form.backgroundType === 'image' && this.form.backgroundImage) {
        return {
          backgroundImage: `linear-gradient(rgba(0,0,0,${opacity}), rgba(0,0,0,${opacity})), url(${this.form.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      }
      return {
        background: this.form.backgroundGradient || DEFAULT_GRADIENT
      }
    }
  },
  created() {
    this.loadConfig()
  },
  methods: {
    applyConfig(config = {}) {
      this.form = {
        backgroundType: config.backgroundType || 'gradient',
        backgroundImage: config.backgroundImage || '',
        backgroundGradient: config.backgroundGradient || DEFAULT_GRADIENT,
        overlayOpacity: config.overlayOpacity ?? 0.15
      }
    },
    async loadConfig() {
      this.loading = true
      try {
        const res = await fetchLoginConfigAdmin()
        this.applyConfig(res.config)
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.loading = false
      }
    },
    async handleSave() {
      this.saving = true
      try {
        const res = await updateLoginConfig({
          backgroundType: this.form.backgroundType,
          backgroundGradient: this.form.backgroundGradient,
          overlayOpacity: this.form.overlayOpacity
        })
        this.applyConfig(res.config)
        this.$message.success('配置已保存')
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.saving = false
      }
    },
    async handleUpload(file) {
      const raw = file.raw
      if (!raw) return
      this.uploading = true
      try {
        const res = await uploadLoginBackground(raw)
        this.applyConfig(res.config)
        this.$message.success(res.message || '上传成功')
      } catch (error) {
        this.$message.error(error.response?.data?.message || error.message || '上传失败')
      } finally {
        this.uploading = false
      }
    },
    handleClearImage() {
      this.$confirm('确定清除背景图片并恢复渐变色背景吗？', '提示', { type: 'warning' })
        .then(async () => {
          const res = await clearLoginBackground()
          this.applyConfig(res.config)
          this.$message.success(res.message || '已清除')
        })
        .catch(() => {})
    },
    handleReset() {
      this.$confirm('确定恢复为默认登录页配置吗？', '提示', { type: 'warning' })
        .then(async () => {
          const res = await resetLoginConfig()
          this.applyConfig(res.config)
          this.$message.success(res.message || '已重置')
        })
        .catch(() => {})
    }
  }
}
</script>

<style scoped>
.card-header {
  font-size: 16px;
  font-weight: 600;
}

.form-tip {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.upload-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.image-path {
  margin-top: 8px;
  color: #606266;
  font-size: 12px;
  word-break: break-all;
}

.preview-box {
  height: 360px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-card {
  width: 260px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 8px;
  padding: 24px 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.preview-title {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #c0392b;
}

.preview-subtitle {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin: 8px 0 20px;
}

.preview-input {
  height: 32px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 12px;
}

.preview-btn {
  height: 36px;
  background: #e74c3c;
  color: #fff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.danger-text {
  color: #f56c6c;
}
</style>
