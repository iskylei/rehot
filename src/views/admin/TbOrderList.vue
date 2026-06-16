<template>
  <div class="tb-order-page">
    <el-card shadow="never">
      <div class="toolbar">
        <el-form :inline="true" :model="filters" size="small" @submit.native.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="子编号/商品/昵称/机构"
              clearable
              style="width: 220px"
              @keyup.enter.native="handleSearch"
            />
          </el-form-item>
          <el-form-item label="订单状态">
            <el-input v-model="filters.orderStatus" placeholder="订单状态" clearable style="width: 120px" />
          </el-form-item>
          <el-form-item label="支付日期">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              value-format="yyyy-MM-dd"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
        <div class="toolbar-actions" v-if="canManage">
          <el-button type="primary" plain icon="el-icon-upload2" @click="openImport">导入</el-button>
          <el-button type="danger" icon="el-icon-plus" @click="openCreate">新增订单</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="items" stripe border size="small">
        <el-table-column prop="bizOrderId" label="淘宝子编号" min-width="150" fixed="left" />
        <el-table-column prop="parentOrderId" label="淘宝主编号" min-width="140" show-overflow-tooltip />
        <el-table-column prop="itemTitle" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="sellerNick" label="服务商昵称" width="110" show-overflow-tooltip />
        <el-table-column prop="adUserNick" label="达人昵称" width="100" show-overflow-tooltip />
        <el-table-column prop="agencyNick" label="机构昵称" width="110" show-overflow-tooltip />
        <el-table-column prop="orderStatus" label="订单状态" width="100" />
        <el-table-column prop="orderPaidTime" label="支付日期" width="150" />
        <el-table-column prop="orderAmount" label="支付金额" width="90" />
        <el-table-column prop="predictAmount" label="预估佣金" width="90" />
        <el-table-column prop="buyAmount" label="数量" width="70">
          <template slot-scope="{ row }">{{ row.buyAmount ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="loginUserName" label="机构名称" width="110" show-overflow-tooltip />
        <el-table-column v-if="canManage" label="操作" width="130" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" @click="openEdit(row)">编辑</el-button>
            <el-button type="text" class="danger-text" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog
      :title="dialogTitle"
      :visible.sync="dialogVisible"
      width="900px"
      top="5vh"
      @closed="resetForm"
    >
      <el-form ref="form" :model="form" :rules="rules" label-width="110px" class="order-form">
        <el-row :gutter="16">
          <el-col v-for="field in formFields" :key="field.prop" :span="12">
            <el-form-item :label="field.label" :prop="field.prop">
              <el-input-number
                v-if="field.type === 'number'"
                v-model="form[field.prop]"
                :min="0"
                controls-position="right"
                style="width: 100%"
              />
              <el-input
                v-else
                v-model="form[field.prop]"
                :disabled="field.prop === 'bizOrderId' && !!editingId"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </span>
    </el-dialog>

    <el-dialog title="导入直播订单" :visible.sync="importVisible" width="760px" @closed="resetImport">
      <div class="import-tip">
        支持 CSV 文件，表头可使用英文字段名或中文列名。
        <el-button type="text" @click="handleDownloadTemplate">下载导入模板</el-button>
      </div>
      <el-upload
        drag
        action=""
        :auto-upload="false"
        :show-file-list="false"
        accept=".csv"
        :on-change="handleFileChange"
      >
        <i class="el-icon-upload" />
        <div class="el-upload__text">将 CSV 文件拖到此处，或<em>点击上传</em></div>
      </el-upload>

      <div v-if="importPreview.length" class="import-preview">
        <div class="import-preview__title">预览（前 {{ importPreview.length }} 条，共 {{ importRows.length }} 条）</div>
        <el-table :data="importPreview" size="mini" border max-height="240">
          <el-table-column label="淘宝子编号" min-width="140">
            <template slot-scope="{ row }">{{ row.biz_order_id || row['淘宝子编号'] || '-' }}</template>
          </el-table-column>
          <el-table-column label="商品名称" min-width="140" show-overflow-tooltip>
            <template slot-scope="{ row }">{{ row.item_title || row['商品名称'] || '-' }}</template>
          </el-table-column>
          <el-table-column label="订单状态" width="100">
            <template slot-scope="{ row }">{{ row.order_status || row['订单状态'] || '-' }}</template>
          </el-table-column>
          <el-table-column label="支付日期" width="140">
            <template slot-scope="{ row }">{{ row.order_paid_time || row['支付日期'] || '-' }}</template>
          </el-table-column>
          <el-table-column label="支付金额" width="90">
            <template slot-scope="{ row }">{{ row.order_amount || row['支付金额'] || '-' }}</template>
          </el-table-column>
        </el-table>
      </div>

      <span slot="footer">
        <el-button @click="importVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="importing"
          :disabled="!importRows.length"
          @click="handleImport"
        >
          确认导入 {{ importRows.length ? `(${importRows.length} 条)` : '' }}
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  fetchTbOrders,
  createTbOrder,
  updateTbOrder,
  deleteTbOrder,
  importTbOrders,
  downloadTbOrderTemplate
} from '@/api/tbOrders'
import { parseCsv } from '@/utils/csv'
import { hasPermission } from '@/utils/auth'

const emptyForm = () => ({
  bizOrderId: '',
  parentOrderId: '',
  sellerNick: '',
  itemTitle: '',
  itemId: '',
  adUserNick: '',
  agencyNick: '',
  orderStatus: '',
  orderPaidTime: '',
  orderAmount: '',
  predictAmount: '',
  orderCommissionAmount: '',
  sellerCommissionRatio: '',
  remark: '',
  refundAmount: '',
  predictTotalAmount: '',
  buyAmount: null,
  loginUserName: '',
  userFlow: ''
})

const FORM_FIELDS = [
  { prop: 'bizOrderId', label: '淘宝子编号' },
  { prop: 'parentOrderId', label: '淘宝主编号' },
  { prop: 'sellerNick', label: '服务商昵称' },
  { prop: 'itemTitle', label: '商品名称' },
  { prop: 'itemId', label: '商品编号' },
  { prop: 'adUserNick', label: '达人昵称' },
  { prop: 'agencyNick', label: '机构昵称' },
  { prop: 'orderStatus', label: '订单状态' },
  { prop: 'orderPaidTime', label: '支付日期' },
  { prop: 'orderAmount', label: '支付金额' },
  { prop: 'predictAmount', label: '预估佣金收入' },
  { prop: 'orderCommissionAmount', label: '成交金额' },
  { prop: 'sellerCommissionRatio', label: '佣金比例' },
  { prop: 'refundAmount', label: '退款金额' },
  { prop: 'predictTotalAmount', label: '预测总金额' },
  { prop: 'buyAmount', label: '购买数量', type: 'number' },
  { prop: 'loginUserName', label: '机构名称' },
  { prop: 'userFlow', label: '流量' },
  { prop: 'remark', label: '备注' }
]

export default {
  name: 'TbOrderList',
  data() {
    return {
      loading: false,
      saving: false,
      importing: false,
      items: [],
      filters: {
        keyword: '',
        orderStatus: '',
        dateRange: []
      },
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0
      },
      dialogVisible: false,
      importVisible: false,
      editingId: null,
      form: emptyForm(),
      formFields: FORM_FIELDS,
      rules: {
        bizOrderId: [{ required: true, message: '请输入淘宝子编号', trigger: 'blur' }]
      },
      importRows: [],
      importPreview: []
    }
  },
  computed: {
    canManage() {
      return hasPermission('tb_order:manage')
    },
    dialogTitle() {
      return this.editingId ? '编辑直播订单' : '新增直播订单'
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    buildQueryParams() {
      const params = {
        keyword: this.filters.keyword,
        orderStatus: this.filters.orderStatus,
        page: this.pagination.page,
        pageSize: this.pagination.pageSize
      }
      if (this.filters.dateRange?.length === 2) {
        params.startDate = this.filters.dateRange[0]
        params.endDate = this.filters.dateRange[1]
      }
      return params
    },
    async loadList() {
      this.loading = true
      try {
        const res = await fetchTbOrders(this.buildQueryParams())
        this.items = res.items || []
        this.pagination.total = res.total || 0
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.loadList()
    },
    resetFilters() {
      this.filters = { keyword: '', orderStatus: '', dateRange: [] }
      this.pagination.page = 1
      this.loadList()
    },
    handlePageChange(page) {
      this.pagination.page = page
      this.loadList()
    },
    handleSizeChange(size) {
      this.pagination.pageSize = size
      this.pagination.page = 1
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
        bizOrderId: row.bizOrderId,
        parentOrderId: row.parentOrderId || '',
        sellerNick: row.sellerNick || '',
        itemTitle: row.itemTitle || '',
        itemId: row.itemId || '',
        adUserNick: row.adUserNick || '',
        agencyNick: row.agencyNick || '',
        orderStatus: row.orderStatus || '',
        orderPaidTime: row.orderPaidTime || '',
        orderAmount: row.orderAmount || '',
        predictAmount: row.predictAmount || '',
        orderCommissionAmount: row.orderCommissionAmount || '',
        sellerCommissionRatio: row.sellerCommissionRatio || '',
        remark: row.remark || '',
        refundAmount: row.refundAmount || '',
        predictTotalAmount: row.predictTotalAmount || '',
        buyAmount: row.buyAmount,
        loginUserName: row.loginUserName || '',
        userFlow: row.userFlow || ''
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
            await updateTbOrder(this.editingId, payload)
            this.$message.success('更新成功')
          } else {
            await createTbOrder(payload)
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
      this.$confirm(`确定删除订单「${row.bizOrderId}」吗？`, '提示', { type: 'warning' })
        .then(async () => {
          await deleteTbOrder(row.id)
          this.$message.success('删除成功')
          this.loadList()
        })
        .catch(() => {})
    },
    openImport() {
      this.importVisible = true
    },
    resetImport() {
      this.importRows = []
      this.importPreview = []
      this.importing = false
    },
    async handleDownloadTemplate() {
      try {
        const blob = await downloadTbOrderTemplate()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'tb_order_import_template.csv'
        link.click()
        window.URL.revokeObjectURL(url)
      } catch (error) {
        this.$message.error(error.message || '模板下载失败')
      }
    },
    handleFileChange(file) {
      const raw = file.raw
      if (!raw) return
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const rows = parseCsv(e.target.result)
          if (!rows.length) {
            this.$message.warning('未解析到有效数据，请检查 CSV 文件')
            return
          }
          this.importRows = rows
          this.importPreview = rows.slice(0, 5)
          this.$message.success(`已解析 ${rows.length} 条记录`)
        } catch (error) {
          this.$message.error('CSV 解析失败')
        }
      }
      reader.readAsText(raw, 'UTF-8')
    },
    async handleImport() {
      if (!this.importRows.length) return
      this.importing = true
      try {
        const res = await importTbOrders(this.importRows)
        const msg = `导入完成：成功 ${res.success} 条，跳过 ${res.skipped} 条，失败 ${res.failed} 条`
        if (res.failed > 0) {
          this.$message.warning(msg)
        } else {
          this.$message.success(msg)
        }
        this.importVisible = false
        this.loadList()
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.importing = false
      }
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

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}

.order-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 8px;
}

.import-tip {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.import-preview {
  margin-top: 16px;
}

.import-preview__title {
  margin-bottom: 8px;
  color: #303133;
  font-size: 13px;
}

.danger-text {
  color: #f56c6c;
}
</style>
