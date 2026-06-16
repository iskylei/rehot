<template>
  <div class="heat-wave-page">
    <el-card shadow="never">
      <div class="toolbar">
        <el-form :inline="true" :model="filters" size="small" @submit.native.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="名称/区域/城市"
              clearable
              @keyup.enter.native="loadList"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部" clearable>
              <el-option label="预报中" value="planned" />
              <el-option label="进行中" value="active" />
              <el-option label="已结束" value="ended" />
            </el-select>
          </el-form-item>
          <el-form-item label="预警等级">
            <el-select v-model="filters.alertLevel" placeholder="全部" clearable>
              <el-option label="蓝色预警" value="blue" />
              <el-option label="黄色预警" value="yellow" />
              <el-option label="橙色预警" value="orange" />
              <el-option label="红色预警" value="red" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadList">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
        <el-button
          v-if="canManage"
          type="danger"
          icon="el-icon-plus"
          @click="openCreate"
        >
          新增热浪事件
        </el-button>
      </div>

      <el-table v-loading="loading" :data="items" stripe border>
        <el-table-column prop="name" label="事件名称" min-width="150" />
        <el-table-column prop="region" label="区域" width="100" />
        <el-table-column prop="city" label="城市" width="100" />
        <el-table-column label="最高温(℃)" width="100">
          <template slot-scope="{ row }">{{ row.maxTemperature }}</template>
        </el-table-column>
        <el-table-column label="预警等级" width="110">
          <template slot-scope="{ row }">
            <el-tag :type="alertTagType(row.alertLevel)" size="small">
              {{ alertLabel(row.alertLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="开始日期" width="120" />
        <el-table-column prop="endDate" label="结束日期" width="120">
          <template slot-scope="{ row }">{{ row.endDate || '-' }}</template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column v-if="canManage" label="操作" width="150" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" @click="openEdit(row)">编辑</el-button>
            <el-button type="text" class="danger-text" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      :title="dialogTitle"
      :visible.sync="dialogVisible"
      width="560px"
      @closed="resetForm"
    >
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="事件名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入事件名称" />
        </el-form-item>
        <el-form-item label="区域" prop="region">
          <el-input v-model="form.region" placeholder="如：华东、华北" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="form.city" placeholder="如：上海、北京" />
        </el-form-item>
        <el-form-item label="最高温度" prop="maxTemperature">
          <el-input-number v-model="form.maxTemperature" :min="20" :max="50" :step="0.1" :precision="1" />
        </el-form-item>
        <el-form-item label="预警等级" prop="alertLevel">
          <el-select v-model="form.alertLevel" placeholder="请选择">
            <el-option label="蓝色预警" value="blue" />
            <el-option label="黄色预警" value="yellow" />
            <el-option label="橙色预警" value="orange" />
            <el-option label="红色预警" value="red" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择">
            <el-option label="预报中" value="planned" />
            <el-option label="进行中" value="active" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="form.startDate"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="选择开始日期"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="form.endDate"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="选择结束日期（可选）"
            clearable
          />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="补充说明" />
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
import {
  fetchHeatWaves,
  createHeatWave,
  updateHeatWave,
  deleteHeatWave
} from '@/api/heatWaves'
import {
  getAlertLevelLabel,
  getStatusLabel,
  ALERT_LEVEL_TAG_TYPES,
  STATUS_TAG_TYPES
} from '@/utils/labels'
import { hasPermission } from '@/utils/auth'

const emptyForm = () => ({
  id: null,
  name: '',
  region: '',
  city: '',
  maxTemperature: 35,
  alertLevel: 'yellow',
  status: 'planned',
  startDate: '',
  endDate: '',
  description: ''
})

export default {
  name: 'HeatWaveList',
  data() {
    return {
      loading: false,
      saving: false,
      items: [],
      filters: {
        keyword: '',
        status: '',
        alertLevel: ''
      },
      dialogVisible: false,
      editingId: null,
      form: emptyForm(),
      rules: {
        name: [{ required: true, message: '请输入事件名称', trigger: 'blur' }],
        region: [{ required: true, message: '请输入区域', trigger: 'blur' }],
        city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
        maxTemperature: [{ required: true, message: '请输入最高温度', trigger: 'change' }],
        alertLevel: [{ required: true, message: '请选择预警等级', trigger: 'change' }],
        status: [{ required: true, message: '请选择状态', trigger: 'change' }],
        startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }]
      }
    }
  },
  computed: {
    canManage() {
      return hasPermission('heat_wave:manage')
    },
    dialogTitle() {
      return this.editingId ? '编辑热浪事件' : '新增热浪事件'
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    alertLabel: getAlertLevelLabel,
    statusLabel: getStatusLabel,
    alertTagType(level) {
      return ALERT_LEVEL_TAG_TYPES[level] || 'info'
    },
    statusTagType(status) {
      return STATUS_TAG_TYPES[status] || 'info'
    },
    async loadList() {
      this.loading = true
      try {
        const res = await fetchHeatWaves({
          keyword: this.filters.keyword,
          status: this.filters.status,
          alertLevel: this.filters.alertLevel
        })
        this.items = res.items || []
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.loading = false
      }
    },
    resetFilters() {
      this.filters = { keyword: '', status: '', alertLevel: '' }
      this.loadList()
    },
    openCreate() {
      this.editingId = null
      this.form = emptyForm()
      this.dialogVisible = true
    },
    openEdit(row) {
      this.editingId = row.id
      this.form = {
        id: row.id,
        name: row.name,
        region: row.region,
        city: row.city,
        maxTemperature: row.maxTemperature,
        alertLevel: row.alertLevel,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate || '',
        description: row.description || ''
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
            region: this.form.region,
            city: this.form.city,
            maxTemperature: this.form.maxTemperature,
            alertLevel: this.form.alertLevel,
            status: this.form.status,
            startDate: this.form.startDate,
            endDate: this.form.endDate,
            description: this.form.description
          }
          if (this.editingId) {
            await updateHeatWave(this.editingId, payload)
            this.$message.success('更新成功')
          } else {
            await createHeatWave(payload)
            this.$message.success('创建成功')
          }
          this.dialogVisible = false
          this.loadList()
        } catch (error) {
          this.$message.error(error.message)
        } finally {
          this.saving = false
        }
      })
    },
    handleDelete(row) {
      this.$confirm(`确定删除「${row.name}」吗？`, '提示', {
        type: 'warning'
      }).then(async () => {
        try {
          await deleteHeatWave(row.id)
          this.$message.success('删除成功')
          this.loadList()
        } catch (error) {
          this.$message.error(error.message)
        }
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.danger-text {
  color: #f56c6c;
}
</style>
