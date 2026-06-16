<template>
  <div class="menu-page">
    <el-card shadow="never">
      <div class="toolbar">
        <div class="toolbar-title">菜单管理</div>
        <el-button
          v-if="canManage"
          type="danger"
          icon="el-icon-plus"
          @click="openCreate"
        >
          新增菜单
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="items"
        row-key="id"
        stripe
        border
        default-expand-all
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="title" label="菜单名称" min-width="180" />
        <el-table-column prop="path" label="路由路径" min-width="180">
          <template slot-scope="{ row }">{{ row.path || '-' }}</template>
        </el-table-column>
        <el-table-column prop="icon" label="图标" width="140">
          <template slot-scope="{ row }">{{ row.icon || '-' }}</template>
        </el-table-column>
        <el-table-column prop="permissionCode" label="权限标识" min-width="160">
          <template slot-scope="{ row }">{{ row.permissionCode || '-' }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="状态" width="90">
          <template slot-scope="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="canManage" label="操作" width="150" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" @click="openEdit(row)">编辑</el-button>
            <el-button type="text" class="danger-text" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="560px" @closed="resetForm">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="上级菜单">
          <el-select v-model="form.parentId" placeholder="顶级菜单" clearable style="width: 100%">
            <el-option label="顶级菜单" :value="0" />
            <el-option
              v-for="menu in parentOptions"
              :key="menu.id"
              :label="menu.title"
              :value="menu.id"
              :disabled="menu.id === editingId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="路由路径">
          <el-input v-model="form.path" placeholder="如 /admin/users，目录可留空" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="如 el-icon-user" />
        </el-form-item>
        <el-form-item label="权限标识">
          <el-select v-model="form.permissionCode" placeholder="可选，用于控制可见性" clearable style="width: 100%">
            <el-option
              v-for="perm in permissions"
              :key="perm.code"
              :label="`${perm.name} (${perm.code})`"
              :value="perm.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
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
import { fetchMenus, fetchMenusFlat, createMenu, updateMenu, deleteMenu } from '@/api/menus'
import { fetchPermissions } from '@/api/roles'
import { hasPermission } from '@/utils/auth'

const emptyForm = () => ({
  parentId: 0,
  title: '',
  path: '',
  icon: '',
  permissionCode: '',
  sortOrder: 0,
  enabled: true
})

export default {
  name: 'MenuList',
  data() {
    return {
      loading: false,
      saving: false,
      items: [],
      flatMenus: [],
      permissions: [],
      dialogVisible: false,
      editingId: null,
      form: emptyForm(),
      rules: {
        title: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }]
      }
    }
  },
  computed: {
    canManage() {
      return hasPermission('system:menu:manage')
    },
    dialogTitle() {
      return this.editingId ? '编辑菜单' : '新增菜单'
    },
    parentOptions() {
      return this.flatMenus.filter(menu => !menu.path)
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [menuRes, flatRes, permRes] = await Promise.all([
          fetchMenus(),
          fetchMenusFlat(),
          fetchPermissions()
        ])
        this.items = menuRes.items || []
        this.flatMenus = flatRes.items || []
        this.permissions = permRes.items || []
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
        parentId: row.parentId || 0,
        title: row.title,
        path: row.path || '',
        icon: row.icon || '',
        permissionCode: row.permissionCode || '',
        sortOrder: row.sortOrder,
        enabled: row.enabled
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
          const payload = { ...this.form }
          if (this.editingId) {
            await updateMenu(this.editingId, payload)
            this.$message.success('更新成功')
          } else {
            await createMenu(payload)
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
      this.$confirm(`确定删除菜单「${row.title}」吗？`, '提示', { type: 'warning' })
        .then(async () => {
          await deleteMenu(row.id)
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
