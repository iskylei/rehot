<template>
  <div class="role-page">
    <el-card shadow="never">
      <div class="toolbar">
        <div class="toolbar-title">角色权限</div>
        <el-button
          v-if="canManage"
          type="danger"
          icon="el-icon-plus"
          @click="openCreate"
        >
          新增角色
        </el-button>
      </div>

      <el-table v-loading="loading" :data="items" stripe border>
        <el-table-column prop="name" label="角色名称" width="160" />
        <el-table-column prop="code" label="角色编码" width="140" />
        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
        <el-table-column label="权限数量" width="100">
          <template slot-scope="{ row }">{{ row.permissionIds.length }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="170" />
        <el-table-column label="操作" width="180" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" @click="openEdit(row)">
              {{ canManage ? '编辑' : '查看' }}
            </el-button>
            <el-button
              v-if="canManage && !isBuiltin(row.code)"
              type="text"
              class="danger-text"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="640px" @closed="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" :disabled="!canManage" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="form.code" :disabled="!!editingId || !canManage" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="2" :disabled="!canManage" />
        </el-form-item>
        <el-form-item label="权限配置">
          <el-checkbox-group v-model="form.permissionIds" :disabled="!canManage">
            <el-checkbox
              v-for="perm in permissions"
              :key="perm.id"
              :label="perm.id"
              class="perm-item"
            >
              {{ perm.name }}
              <span class="perm-code">({{ perm.code }})</span>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">{{ canManage ? '取消' : '关闭' }}</el-button>
        <el-button v-if="canManage" type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { fetchRoles, fetchPermissions, createRole, updateRole, deleteRole } from '@/api/roles'
import { hasPermission } from '@/utils/auth'

const emptyForm = () => ({
  name: '',
  code: '',
  description: '',
  permissionIds: []
})

export default {
  name: 'RoleList',
  data() {
    return {
      loading: false,
      saving: false,
      items: [],
      permissions: [],
      dialogVisible: false,
      editingId: null,
      form: emptyForm(),
      rules: {
        name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
        code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
      }
    }
  },
  computed: {
    canManage() {
      return hasPermission('system:role:manage')
    },
    dialogTitle() {
      if (!this.editingId) return '新增角色'
      return this.canManage ? '编辑角色' : '查看角色'
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    isBuiltin(code) {
      return ['admin', 'operator', 'viewer'].includes(code)
    },
    async loadData() {
      this.loading = true
      try {
        const [rolesRes, permsRes] = await Promise.all([fetchRoles(), fetchPermissions()])
        this.items = rolesRes.items || []
        this.permissions = permsRes.items || []
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.editingId = null
      this.form = emptyForm()
      this.dialogVisible = true
    },
    openEdit(row) {
      this.editingId = row.id
      this.form = {
        name: row.name,
        code: row.code,
        description: row.description || '',
        permissionIds: [...row.permissionIds]
      }
      this.dialogVisible = true
    },
    resetForm() {
      this.$refs.form && this.$refs.form.resetFields()
      this.form = emptyForm()
      this.editingId = null
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          const payload = {
            name: this.form.name,
            description: this.form.description,
            permissionIds: this.form.permissionIds
          }
          if (this.editingId) {
            await updateRole(this.editingId, payload)
            this.$message.success('更新成功')
          } else {
            await createRole({ ...payload, code: this.form.code })
            this.$message.success('创建成功')
          }
          this.dialogVisible = false
          this.loadData()
        } catch (error) {
          this.$message.error(error.message)
        } finally {
          this.saving = false
        }
      })
    },
    handleDelete(row) {
      this.$confirm(`确定删除角色「${row.name}」吗？`, '提示', { type: 'warning' })
        .then(async () => {
          await deleteRole(row.id)
          this.$message.success('删除成功')
          this.loadData()
        })
        .catch(() => {})
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.perm-item {
  display: block;
  margin: 6px 0;
}

.perm-code {
  color: #909399;
  font-size: 12px;
}

.danger-text {
  color: #f56c6c;
}
</style>
