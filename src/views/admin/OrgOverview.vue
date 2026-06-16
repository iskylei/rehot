<template>
  <div class="org-overview-page">
    <el-card v-if="!orgName" shadow="never" class="page-intro-card">
      <el-empty description="请通过左侧菜单进入，或在地址栏指定机构参数">
        <div class="org-hint">路径示例：/admin/org-overview?org=联奇文化</div>
      </el-empty>
    </el-card>

    <template v-else>
      <el-card shadow="never" class="page-intro-card">
        <div class="page-intro-title">{{ orgName }} 数据总览</div>
        <div class="page-intro-desc">仅统计机构名称为「{{ orgName }}」的订单数据</div>
      </el-card>

      <el-row v-loading="statsLoading" :gutter="12" class="stats-row stats-row--global" type="flex">
        <el-col
          v-for="item in globalStatCards"
          :key="item.key"
          class="stat-col-global"
        >
          <el-card shadow="hover" class="stat-card">
            <div class="stat-label">{{ item.label }}</div>
            <div class="stat-value" :class="{ highlight: item.highlight }">{{ item.value }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="stats-filter-card">
        <el-form :inline="true" size="small" @submit.native.prevent>
          <el-form-item label="支付日期">
            <el-date-picker
              v-model="statsDateRange"
              type="daterange"
              value-format="yyyy-MM-dd"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleStatsSearch">查询</el-button>
            <el-button
              type="success"
              icon="el-icon-download"
              :loading="exportLoading"
              @click="handleExport"
            >
              导出 Excel
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-row :gutter="16" class="stats-row stats-row--period">
        <el-col :span="6" v-for="item in periodStatCards" :key="item.key">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-label">{{ item.label }}</div>
            <div class="stat-value" :class="{ highlight: item.highlight }">{{ item.value }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="filter-card">
        <el-form :inline="true" :model="chartFilters" size="small" @submit.native.prevent>
          <el-form-item label="达人名称">
            <el-input v-model="chartFilters.adUserNick" placeholder="达人昵称" clearable />
          </el-form-item>
          <el-form-item label="店铺名称">
            <el-input v-model="chartFilters.sellerNick" placeholder="店铺/服务商" clearable />
          </el-form-item>
          <el-form-item label="商品名称">
            <el-input v-model="chartFilters.itemTitle" placeholder="商品名称" clearable />
          </el-form-item>
          <el-form-item label="订单状态">
            <el-select v-model="chartFilters.orderStatus" placeholder="全部" clearable style="width: 180px">
              <el-option
                v-for="item in orderStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="支付日期">
            <el-date-picker
              v-model="chartFilters.dateRange"
              type="daterange"
              value-format="yyyy-MM-dd"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleChartSearch">查询</el-button>
            <el-button @click="resetChartFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-row :gutter="16" class="charts-row">
        <el-col :span="24">
          <el-card shadow="never" class="chart-card chart-card--product" v-loading="chartLoading">
            <div slot="header" class="chart-header">
              <span>商品支付统计</span>
              <span class="chart-subtitle">按支付日期与商品名称汇总</span>
            </div>
            <div class="chart-body">
              <div ref="productChart" class="product-chart product-chart--main"></div>
              <div v-if="!chartLoading && !chartHasData" class="chart-empty">暂无统计数据</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="charts-row">
        <el-col :span="12">
          <el-card shadow="never" class="chart-card" v-loading="commissionChartLoading">
            <div slot="header" class="chart-header">
              <span>商品预估佣金</span>
              <span class="chart-subtitle">支付日期：{{ commissionChartDateRange || '-' }}</span>
            </div>
            <div ref="commissionChart" class="product-chart"></div>
            <div v-if="!commissionChartLoading && !commissionChartHasData" class="chart-empty">所选日期暂无佣金数据</div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never" class="chart-card" v-loading="adUserChartLoading">
            <div slot="header" class="chart-header">
              <span>达人支付与佣金统计</span>
              <span class="chart-subtitle">支付日期：{{ adUserChartDateRange || '-' }}</span>
            </div>
            <div ref="adUserChart" class="product-chart"></div>
            <div v-if="!adUserChartLoading && !adUserChartHasData" class="chart-empty">所选日期暂无达人数据</div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="charts-row">
        <el-col :span="24">
          <el-card shadow="never" class="chart-card chart-card--product" v-loading="sellerChartLoading">
            <div slot="header" class="chart-header">
              <span>店铺支付与佣金统计</span>
              <span class="chart-subtitle">支付日期：{{ sellerChartDateRange || '-' }}</span>
            </div>
            <div class="chart-body">
              <div ref="sellerChart" class="product-chart product-chart--main"></div>
              <div v-if="!sellerChartLoading && !sellerChartHasData" class="chart-empty">所选日期暂无店铺数据</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="charts-row">
        <el-col :span="24">
          <el-card shadow="never" class="chart-card chart-card--product" v-loading="hourlyChartLoading">
            <div slot="header" class="chart-header">
              <span>分时支付与佣金统计</span>
              <span class="chart-subtitle">支付日期：{{ hourlyChartDateRange || '-' }} · 按 24 小时时段汇总</span>
            </div>
            <div class="chart-body">
              <div ref="hourlyChart" class="product-chart product-chart--main"></div>
              <div v-if="!hourlyChartLoading && !hourlyChartHasData" class="chart-empty">所选日期暂无分时数据</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="charts-row">
        <el-col :span="24">
          <el-card shadow="never" class="chart-card chart-card--product" v-loading="dailyChartLoading">
            <div slot="header" class="chart-header">
              <span>近60日支付统计</span>
              <span class="chart-subtitle">统计区间：{{ dailyChartDateRange || '-' }} · 每日支付总额与订单数量</span>
            </div>
            <div class="chart-body">
              <div ref="dailyChart" class="product-chart product-chart--main"></div>
              <div v-if="!dailyChartLoading && !dailyChartHasData" class="chart-empty">近60日暂无订单数据</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="list-card">
        <el-table v-loading="listLoading" :data="items" stripe border size="small">
          <el-table-column prop="bizOrderId" label="淘宝子编号" min-width="140" fixed="left" />
          <el-table-column prop="adUserNick" label="达人名称" width="100" show-overflow-tooltip />
          <el-table-column prop="sellerNick" label="店铺名称" width="110" show-overflow-tooltip />
          <el-table-column prop="itemTitle" label="商品名称" min-width="150" show-overflow-tooltip />
          <el-table-column prop="orderStatus" label="订单状态" width="150" />
          <el-table-column prop="orderPaidTime" label="支付日期" width="160" />
          <el-table-column prop="orderAmount" label="支付金额(元)" width="110" />
          <el-table-column prop="predictAmount" label="预估佣金(元)" width="110" />
          <el-table-column prop="refundAmount" label="退款金额(元)" width="110" />
          <el-table-column prop="sellerCommissionRatio" label="佣金比例" width="90" />
          <el-table-column prop="buyAmount" label="数量" width="70">
            <template slot-scope="{ row }">{{ row.buyAmount ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="userFlow" label="流量来源" width="110" show-overflow-tooltip />
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
    </template>
  </div>
</template>

<script>
import { fetchOrgLiveOverviewStats, downloadOrgLiveOverviewExport, fetchLiveOverviewOrders } from '@/api/liveOverview'
import liveOverviewChartsMixin from '@/mixins/liveOverviewCharts'

function getDefaultDateRange() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const day = `${yyyy}-${mm}-${dd}`
  return [day, day]
}

export default {
  name: 'OrgOverview',
  mixins: [liveOverviewChartsMixin],
  data() {
    return {
      statsLoading: false,
      exportLoading: false,
      statsDateRange: getDefaultDateRange(),
      stats: {
        totalOrderAmount: '0.00',
        todayOrderAmount: '0.00',
        monthOrderAmount: '0.00',
        totalRefundAmount: '0.00',
        totalPredictAmount: '0.00',
        avgCommissionRatio: '-',
        latestPaidTime: '-'
      },
      listLoading: false,
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0
      }
    }
  },
  computed: {
    orgName() {
      return String(this.$route.query.org || '').trim()
    },
    globalStatCards() {
      return [
        { key: 'total', label: '订单支付总金额(元)', value: this.stats.totalOrderAmount },
        { key: 'predict', label: '预估佣金总额(元)', value: this.stats.totalPredictAmount },
        { key: 'ratio', label: '佣金比例平均值', value: this.stats.avgCommissionRatio },
        { key: 'refund', label: '退款金额(元)', value: this.stats.totalRefundAmount },
        { key: 'latest', label: '直播实时时间', value: this.stats.latestPaidTime, highlight: true }
      ]
    },
    periodStatCards() {
      return [
        { key: 'today', label: '当日支付总金额(元)', value: this.stats.todayOrderAmount, highlight: true },
        { key: 'month', label: '本月累计金额(元)', value: this.stats.monthOrderAmount }
      ]
    }
  },
  watch: {
    orgName: {
      immediate: true,
      handler(value) {
        if (value) {
          this.loadPageData()
        }
      }
    }
  },
  mounted() {
    this.initCharts()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    this.disposeCharts()
  },
  methods: {
    buildStatsParams() {
      const dateRange = this.statsDateRange?.length === 2
        ? this.statsDateRange
        : getDefaultDateRange()

      return {
        orgName: this.orgName,
        startDate: dateRange[0],
        endDate: dateRange[1]
      }
    },
    buildChartFilterParams() {
      const dateRange = this.chartFilters.dateRange?.length === 2
        ? this.chartFilters.dateRange
        : getDefaultDateRange()

      return {
        orgName: this.orgName,
        adUserNick: this.chartFilters.adUserNick,
        sellerNick: this.chartFilters.sellerNick,
        itemTitle: this.chartFilters.itemTitle,
        orderStatus: this.chartFilters.orderStatus,
        startDate: dateRange[0],
        endDate: dateRange[1]
      }
    },
    buildQueryParams() {
      return {
        ...this.buildChartFilterParams(),
        page: this.pagination.page,
        pageSize: this.pagination.pageSize
      }
    },
    loadPageData() {
      this.pagination.page = 1
      this.loadMeta()
      this.loadStats()
      this.$nextTick(() => {
        this.loadAllCharts()
        this.loadList()
      })
    },
    async loadStats() {
      if (!this.orgName) return

      this.statsLoading = true
      try {
        const res = await fetchOrgLiveOverviewStats(this.buildStatsParams())
        this.stats = res.stats || this.stats
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.statsLoading = false
      }
    },
    handleStatsSearch() {
      this.loadStats()
    },
    handleChartSearch() {
      this.pagination.page = 1
      this.loadAllCharts()
      this.loadList()
    },
    resetChartFilters() {
      this.chartFilters = {
        adUserNick: '',
        sellerNick: '',
        itemTitle: '',
        orderStatus: '',
        dateRange: getDefaultDateRange()
      }
      this.pagination.page = 1
      this.loadAllCharts()
      this.loadList()
    },
    async loadList() {
      if (!this.orgName) return

      this.listLoading = true
      try {
        const res = await fetchLiveOverviewOrders(this.buildQueryParams())
        this.items = res.items || []
        this.pagination.total = res.total || 0
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.listLoading = false
      }
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
    async handleExport() {
      const params = this.buildStatsParams()
      if (!params.orgName) {
        this.$message.warning('未指定机构名称，无法导出')
        return
      }
      if (!params.startDate || !params.endDate) {
        this.$message.warning('请选择支付日期范围后再导出')
        return
      }

      this.exportLoading = true
      try {
        const { blob, filename } = await downloadOrgLiveOverviewExport(params)
        const link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = filename
        link.click()
        window.URL.revokeObjectURL(link.href)
        this.$message.success('导出成功')
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.exportLoading = false
      }
    }
  }
}
</script>

<style scoped>
.page-intro-card,
.stats-filter-card,
.stats-row,
.filter-card,
.charts-row,
.chart-card {
  margin-bottom: 16px;
}

.page-intro-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.page-intro-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}

.org-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.stats-filter-card ::v-deep .el-card__body {
  padding-bottom: 2px;
}

.stats-row--global {
  flex-wrap: nowrap;
}

.stats-row--global .stat-col-global {
  flex: 1;
  min-width: 0;
}

.stats-row--global .stat-card {
  min-height: 84px;
}

.stats-row--global .stat-label {
  font-size: 12px;
}

.stats-row--global .stat-value {
  font-size: 20px;
}

.stat-card {
  margin-bottom: 16px;
  min-height: 96px;
}

.stat-label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 10px;
  line-height: 1.4;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  word-break: break-all;
}

.stat-value.highlight {
  color: #e74c3c;
}

.chart-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.chart-subtitle {
  color: #909399;
  font-size: 12px;
}

.chart-card ::v-deep .el-card__body {
  overflow: visible;
}

.product-chart {
  width: 100%;
  height: 380px;
  overflow: visible;
}

.chart-empty {
  margin-top: -220px;
  text-align: center;
  color: #909399;
  font-size: 14px;
  pointer-events: none;
}

.list-card {
  margin-bottom: 16px;
}

.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}
</style>
