<template>
  <div class="user-page">
    <el-card shadow="never">
      <div class="toolbar">
        <div class="toolbar-title">用户管理</div>
        <el-button
          v-if="canManage"
          type="danger"
          icon="el-icon-plus"
          @click="openCreate"
        >
          新增用户
        </el-button>
      </div>

      <el-table v-loading="loading" :data="items" stripe border>
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="displayName" label="显示名称" min-width="140">
          <template slot-scope="{ row }">{{ row.displayName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="roleName" label="角色" width="140">
          <template slot-scope="{ row }">{{ row.roleName || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
              {{ row.status === 'enabled' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column v-if="canManage" label="操作" width="160" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.username !== 'admin'"
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="520px" @closed="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="!!editingId" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item :label="editingId ? '新密码' : '密码'" :prop="editingId ? '' : 'password'">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editingId ? '留空则不修改' : '请输入密码'"
          />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="form.displayName" placeholder="可选" />
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="enabled">启用</el-radio>
            <el-radio label="disabled" :disabled="form.username === 'admin'">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { fetchUsers, createUser, updateUser, deleteUser } from '@/api/users'
import { fetchRoles } from '@/api/roles'
import { hasPermission } from '@/utils/auth'

const emptyForm = () => ({
  username: '',
  password: '',
  displayName: '',
  roleId: null,
  status: 'enabled'
})

export default {
  name: 'UserList',
  data() {
    return {
      loading: false,
      saving: false,
      items: [],
      roles: [],
      dialogVisible: false,
      editingId: null,
      form: emptyForm(),
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
        roleId: [{ required: true, message: '请选择角色', trigger: 'change' }]
      }
    }
  },
  computed: {
    canManage() {
      return hasPermission('system:user:manage')
    },
    dialogTitle() {
      return this.editingId ? '编辑用户' : '新增用户'
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [usersRes, rolesRes] = await Promise.all([fetchUsers(), fetchRoles()])
        this.items = usersRes.items || []
        this.roles = rolesRes.items || []
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
        username: row.username,
        password: '',
        displayName: row.displayName || '',
        roleId: row.roleId,
        status: row.status
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
            displayName: this.form.displayName,
            roleId: this.form.roleId,
            status: this.form.status
          }
          if (this.editingId) {
            if (this.form.password) payload.password = this.form.password
            await updateUser(this.editingId, payload)
            this.$message.success('更新成功')
          } else {
            await createUser({
              username: this.form.username,
              password: this.form.password,
              ...payload
            })
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
      this.$confirm(`确定删除用户「${row.username}」吗？`, '提示', { type: 'warning' })
        .then(async () => {
          await deleteUser(row.id)
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

.danger-text {
  color: #f56c6c;
}
</style>
