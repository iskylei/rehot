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
      </div>

      <div class="duplicate-summary">
        共 {{ pagination.total }} 组重复，涉及 {{ totalRows }} 条订单。
        默认按全部日期查询；可按支付日期缩小范围。
      </div>

      <el-table v-loading="loading" :data="groups" stripe border size="small">
        <el-table-column type="expand">
          <template slot-scope="{ row }">
            <el-table :data="row.orders" border size="mini">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="bizOrderId" label="淘宝子编号" min-width="150" show-overflow-tooltip />
              <el-table-column prop="parentOrderId" label="淘宝主编号" min-width="140" show-overflow-tooltip />
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
import { fetchTbOrderDuplicates, deleteTbOrder } from '@/api/tbOrders'
import { hasPermission } from '@/utils/auth'

const emptyFilters = () => ({
  groupBy: 'bizOrderId',
  dateRange: []
})

export default {
  name: 'TbOrderDuplicates',
  data() {
    return {
      loading: false,
      groups: [],
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
      } catch (error) {
        this.$message.error(error.message || '查询重复订单失败')
      } finally {
        this.loading = false
      }
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
