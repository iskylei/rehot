<template>
  <div class="tb-order-duplicates-page">
    <el-card shadow="never">
      <div class="toolbar">
        <el-form :inline="true" :model="filters" size="small" @submit.native.prevent>
          <el-form-item label="重复依据">
            <el-select v-model="filters.groupBy" style="width: 160px">
              <el-option label="淘宝子编号" value="bizOrderId" />
              <el-option label="淘宝主编号" value="parentOrderId" />
            </el-select>
          </el-form-item>
          <el-form-item label="机构昵称">
            <el-input
              v-model="filters.agencyNick"
              placeholder="机构昵称"
              clearable
              style="width: 160px"
              @keyup.enter.native="handleSearch"
            />
          </el-form-item>
          <el-form-item label="支付日期">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              value-format="yyyy-MM-dd"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              clearable
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
        <div class="toolbar-actions" v-if="canManage">
          <el-button
            type="danger"
            plain
            icon="el-icon-delete"
            :disabled="!selectedGroups.length"
            :loading="deleting"
            @click="handleBatchDelete"
          >
            批量删除重复{{ selectedGroups.length ? ` (${selectedGroups.length} 组)` : '' }}
          </el-button>
        </div>
      </div>

      <div class="duplicate-summary">
        共 {{ pagination.total }} 组重复，涉及 {{ totalRows }} 条订单。
        批量删除规则：组内存在「订单取消」则整组删除；否则保留 ID 最小的 1 条。
      </div>

      <el-table
        ref="groupTable"
        v-loading="loading"
        :data="groups"
        stripe
        border
        size="small"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="canManage" type="selection" width="46" />
        <el-table-column type="expand">
          <template slot-scope="{ row }">
            <el-table :data="row.orders" border size="mini">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="bizOrderId" label="淘宝子编号" min-width="150" show-overflow-tooltip />
              <el-table-column prop="parentOrderId" label="淘宝主编号" min-width="140" show-overflow-tooltip />
              <el-table-column prop="agencyNick" label="机构昵称" min-width="120" show-overflow-tooltip />
              <el-table-column prop="itemTitle" label="商品名称" min-width="160" show-overflow-tooltip />
              <el-table-column prop="orderStatus" label="订单状态" width="110" />
              <el-table-column prop="orderPaidTime" label="支付日期" width="160" />
              <el-table-column prop="orderAmount" label="支付金额" width="90" />
              <el-table-column prop="loginUserName" label="机构名称" min-width="110" show-overflow-tooltip />
              <el-table-column v-if="canManage" label="操作" width="80" fixed="right">
                <template slot-scope="{ row: order }">
                  <el-button type="text" class="danger-text" @click="handleDelete(order)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="key" :label="keyLabel" min-width="180" show-overflow-tooltip />
        <el-table-column prop="count" label="重复条数" width="100" />
        <el-table-column label="机构昵称" min-width="120" show-overflow-tooltip>
          <template slot-scope="{ row }">{{ (row.orders[0] && row.orders[0].agencyNick) || '-' }}</template>
        </el-table-column>
        <el-table-column label="商品名称" min-width="180" show-overflow-tooltip>
          <template slot-scope="{ row }">{{ (row.orders[0] && row.orders[0].itemTitle) || '-' }}</template>
        </el-table-column>
        <el-table-column label="支付日期" min-width="160" show-overflow-tooltip>
          <template slot-scope="{ row }">{{ (row.orders[0] && row.orders[0].orderPaidTime) || '-' }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100, 200, 500]"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script>
import { fetchTbOrderDuplicates, deleteTbOrder, batchDeleteDuplicateTbOrders } from '@/api/tbOrders'
import { hasPermission } from '@/utils/auth'

function getDefaultDateRange() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const day = `${yyyy}-${mm}-${dd}`
  return [day, day]
}

const emptyFilters = () => ({
  groupBy: 'bizOrderId',
  agencyNick: '',
  dateRange: getDefaultDateRange()
})

export default {
  name: 'TbOrderDuplicates',
  data() {
    return {
      loading: false,
      deleting: false,
      groups: [],
      selectedGroups: [],
      totalRows: 0,
      filters: emptyFilters(),
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0
      }
    }
  },
  computed: {
    canManage() {
      return hasPermission('tb_order:manage')
    },
    keyLabel() {
      return this.filters.groupBy === 'parentOrderId' ? '淘宝主编号' : '淘宝子编号'
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    buildQueryParams() {
      const params = {
        groupBy: this.filters.groupBy,
        agencyNick: this.filters.agencyNick,
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
        const res = await fetchTbOrderDuplicates(this.buildQueryParams())
        this.groups = res.items || []
        this.pagination.total = res.total || 0
        this.totalRows = res.totalRows || 0
        if (!this.groups.length && this.pagination.page > 1) {
          this.pagination.page -= 1
          return this.loadList()
        }
        this.clearSelection()
      } catch (error) {
        this.$message.error(error.message || '查询重复订单失败')
      } finally {
        this.loading = false
      }
    },
    handleSelectionChange(rows) {
      this.selectedGroups = rows || []
    },
    clearSelection() {
      this.selectedGroups = []
      this.$refs.groupTable && this.$refs.groupTable.clearSelection()
    },
    handleSearch() {
      this.pagination.page = 1
      this.loadList()
    },
    resetFilters() {
      this.filters = emptyFilters()
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
    handleDelete(row) {
      this.$confirm(`确定删除订单「${row.bizOrderId}」吗？`, '提示', { type: 'warning' })
        .then(async () => {
          await deleteTbOrder(row.id)
          this.$message.success('删除成功')
          this.loadList()
        })
        .catch(() => {})
    },
    handleBatchDelete() {
      if (!this.selectedGroups.length) return
      const groupCount = this.selectedGroups.length
      this.$confirm(
        `已选 ${groupCount} 组。组内存在「订单取消」将整组删除；否则保留 ID 最小的 1 条，删除其余重复订单。此操作不可恢复。`,
        '批量删除重复',
        { type: 'warning' }
      )
        .then(async () => {
          this.deleting = true
          try {
            const params = this.buildQueryParams()
            const res = await batchDeleteDuplicateTbOrders({
              groupBy: params.groupBy,
              agencyNick: params.agencyNick,
              startDate: params.startDate,
              endDate: params.endDate,
              keys: this.selectedGroups.map(group => group.key)
            })
            const cleared = res.clearedGroups || 0
            const extra = cleared ? `，其中 ${cleared} 组因含取消订单已整组删除` : ''
            this.$message.success(`已删除 ${res.deleted || 0} 条重复订单，保留 ${res.kept || 0} 条${extra}`)
            this.loadList()
          } catch (error) {
            this.$message.error(error.message || '批量删除失败')
          } finally {
            this.deleting = false
          }
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
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.duplicate-summary {
  margin: 0 0 12px;
  color: #606266;
  font-size: 13px;
}

.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}

.danger-text {
  color: #f56c6c;
}
</style>
