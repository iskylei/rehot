<template>
  <div class="live-overview-page" v-loading="statsLoading">
    <el-row :gutter="12" class="stats-row stats-row--global" type="flex">
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
          <el-button type="success" icon="el-icon-download" :loading="exportLoading" @click="handleExport">
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
      <el-form :inline="true" :model="filters" size="small" @submit.native.prevent>
        <el-form-item label="机构名称">
          <el-input v-model="filters.loginUserName" placeholder="机构名称" clearable />
        </el-form-item>
        <el-form-item label="达人名称">
          <el-input v-model="filters.adUserNick" placeholder="达人昵称" clearable />
        </el-form-item>
        <el-form-item label="店铺名称">
          <el-input v-model="filters.sellerNick" placeholder="店铺/服务商" clearable />
        </el-form-item>
        <el-form-item label="商品名称">
          <el-input v-model="filters.itemTitle" placeholder="商品名称" clearable />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="filters.orderStatus" placeholder="全部" clearable style="width: 180px">
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
            v-model="filters.dateRange"
            type="daterange"
            value-format="yyyy-MM-dd"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
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

    <el-card shadow="never">
      <el-table v-loading="listLoading" :data="items" stripe border size="small">
        <el-table-column prop="bizOrderId" label="淘宝子编号" min-width="140" fixed="left" />
        <el-table-column prop="loginUserName" label="机构名称" width="110" show-overflow-tooltip />
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
  </div>
</template>

<script>
import * as echarts from 'echarts'
import {
  fetchLiveOverviewStats,
  fetchOrderStatuses,
  fetchLiveOverviewOrders,
  fetchLiveOverviewProductChart,
  fetchProductCommissionChart,
  fetchAdUserAmountChart,
  fetchSellerAmountChart,
  fetchHourlyAmountChart,
  fetchDailyAmountChart,
  downloadLiveOverviewExport
} from '@/api/liveOverview'

function getDefaultDateRange() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const day = `${yyyy}-${mm}-${dd}`
  return [day, day]
}

export default {
  name: 'LiveOverview',
  data() {
    return {
      statsLoading: false,
      exportLoading: false,
      statsDateRange: getDefaultDateRange(),
      listLoading: false,
      chartLoading: false,
      commissionChartLoading: false,
      adUserChartLoading: false,
      sellerChartLoading: false,
      hourlyChartLoading: false,
      dailyChartLoading: false,
      chartHasData: false,
      commissionChartHasData: false,
      adUserChartHasData: false,
      sellerChartHasData: false,
      hourlyChartHasData: false,
      dailyChartHasData: false,
      commissionChartDateRange: '',
      adUserChartDateRange: '',
      sellerChartDateRange: '',
      hourlyChartDateRange: '',
      dailyChartDateRange: '',
      chartInstance: null,
      commissionChartInstance: null,
      adUserChartInstance: null,
      sellerChartInstance: null,
      hourlyChartInstance: null,
      dailyChartInstance: null,
      stats: {
        totalOrderAmount: '0.00',
        todayOrderAmount: '0.00',
        monthOrderAmount: '0.00',
        totalRefundAmount: '0.00',
        totalPredictAmount: '0.00',
        avgCommissionRatio: '-',
        latestPaidTime: '-'
      },
      orderStatusOptions: [],
      items: [],
      filters: {
        loginUserName: '',
        adUserNick: '',
        sellerNick: '',
        itemTitle: '',
        orderStatus: '',
        dateRange: getDefaultDateRange()
      },
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0
      }
    }
  },
  computed: {
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
  created() {
    this.loadMeta()
    this.loadStats()
    this.loadList()
  },
  mounted() {
    this.initCharts()
    this.loadChart()
    this.loadCommissionChart()
    this.loadAdUserChart()
    this.loadSellerChart()
    this.loadHourlyChart()
    this.loadDailyChart()
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
        startDate: dateRange[0],
        endDate: dateRange[1]
      }
    },
    buildFilterParams() {
      const dateRange = this.filters.dateRange?.length === 2
        ? this.filters.dateRange
        : getDefaultDateRange()

      return {
        loginUserName: this.filters.loginUserName,
        adUserNick: this.filters.adUserNick,
        sellerNick: this.filters.sellerNick,
        itemTitle: this.filters.itemTitle,
        orderStatus: this.filters.orderStatus,
        startDate: dateRange[0],
        endDate: dateRange[1]
      }
    },
    buildQueryParams() {
      return {
        ...this.buildFilterParams(),
        page: this.pagination.page,
        pageSize: this.pagination.pageSize
      }
    },
    buildDailyChartParams() {
      return {
        loginUserName: this.filters.loginUserName,
        adUserNick: this.filters.adUserNick,
        sellerNick: this.filters.sellerNick,
        itemTitle: this.filters.itemTitle,
        orderStatus: this.filters.orderStatus
      }
    },
    initCharts() {
      if (this.$refs.productChart && !this.chartInstance) {
        this.chartInstance = echarts.init(this.$refs.productChart)
      }
      if (this.$refs.commissionChart && !this.commissionChartInstance) {
        this.commissionChartInstance = echarts.init(this.$refs.commissionChart)
      }
      if (this.$refs.adUserChart && !this.adUserChartInstance) {
        this.adUserChartInstance = echarts.init(this.$refs.adUserChart)
      }
      if (this.$refs.sellerChart && !this.sellerChartInstance) {
        this.sellerChartInstance = echarts.init(this.$refs.sellerChart)
      }
      if (this.$refs.hourlyChart && !this.hourlyChartInstance) {
        this.hourlyChartInstance = echarts.init(this.$refs.hourlyChart)
      }
      if (this.$refs.dailyChart && !this.dailyChartInstance) {
        this.dailyChartInstance = echarts.init(this.$refs.dailyChart)
      }
    },
    disposeCharts() {
      if (this.chartInstance) {
        this.chartInstance.dispose()
        this.chartInstance = null
      }
      if (this.commissionChartInstance) {
        this.commissionChartInstance.dispose()
        this.commissionChartInstance = null
      }
      if (this.adUserChartInstance) {
        this.adUserChartInstance.dispose()
        this.adUserChartInstance = null
      }
      if (this.sellerChartInstance) {
        this.sellerChartInstance.dispose()
        this.sellerChartInstance = null
      }
      if (this.hourlyChartInstance) {
        this.hourlyChartInstance.dispose()
        this.hourlyChartInstance = null
      }
      if (this.dailyChartInstance) {
        this.dailyChartInstance.dispose()
        this.dailyChartInstance = null
      }
    },
    truncateTitle(title, maxLength = 14) {
      if (!title) return '未知商品'
      return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title
    },
    getChartTooltip({ formatter, axisPointer }) {
      return {
        trigger: 'axis',
        confine: true,
        appendToBody: false,
        axisPointer,
        textStyle: {
          fontSize: 12
        },
        extraCssText: 'max-width: 320px; white-space: normal; word-break: break-all;',
        position: (point, params, dom, rect, size) => {
          const gap = 12
          const [tipWidth, tipHeight] = size.contentSize
          const [viewWidth, viewHeight] = size.viewSize
          let x = point[0] + gap
          let y = point[1] - tipHeight / 2

          if (x + tipWidth > viewWidth - gap) {
            x = point[0] - tipWidth - gap
          }
          if (x < gap) {
            x = gap
          }

          if (y + tipHeight > viewHeight - gap) {
            y = viewHeight - tipHeight - gap
          }
          if (y < gap) {
            y = gap
          }

          return [x, y]
        },
        formatter
      }
    },
    buildChartOption(items) {
      const categories = items.map(item => `${item.paidDate}\n${this.truncateTitle(item.itemTitle)}`)
      const amounts = items.map(item => Number(item.totalAmount) || 0)
      const counts = items.map(item => Number(item.orderCount) || 0)
      const showZoom = categories.length > 8

      return {
        color: ['#409EFF', '#E6A23C'],
        tooltip: this.getChartTooltip({
          axisPointer: { type: 'cross' },
          formatter: params => {
            const index = params[0]?.dataIndex ?? 0
            const item = items[index]
            if (!item) return ''
            return [
              `支付日期：${item.paidDate}`,
              `商品名称：${item.itemTitle}`,
              `支付金额：${item.totalAmount} 元`,
              `订单数量：${item.orderCount} 单`
            ].join('<br/>')
          }
        }),
        legend: {
          data: ['支付金额', '订单数量'],
          top: 0
        },
        grid: {
          left: 56,
          right: 56,
          top: 64,
          bottom: showZoom ? 72 : 56,
          containLabel: true
        },
        dataZoom: showZoom ? [
          {
            type: 'slider',
            start: 0,
            end: Math.min(100, Math.round((8 / categories.length) * 100)),
            height: 18,
            bottom: 8
          },
          {
            type: 'inside',
            start: 0,
            end: Math.min(100, Math.round((8 / categories.length) * 100))
          }
        ] : [],
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            interval: 0,
            rotate: categories.length > 6 ? 30 : 0,
            fontSize: 11,
            lineHeight: 16
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '支付金额(元)',
            axisLabel: {
              formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
            }
          },
          {
            type: 'value',
            name: '订单数量(单)',
            minInterval: 1,
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: '支付金额',
            type: 'bar',
            barMaxWidth: 36,
            data: amounts,
            yAxisIndex: 0
          },
          {
            name: '订单数量',
            type: 'line',
            smooth: true,
            symbolSize: 7,
            data: counts,
            yAxisIndex: 1,
            label: {
              show: true,
              position: 'top',
              distance: 6,
              color: '#E6A23C',
              fontSize: 11,
              formatter: ({ value }) => `【${value}单】`
            }
          }
        ]
      }
    },
    buildCommissionChartOption(items) {
      const categories = items.map(item => this.truncateTitle(item.itemTitle, 10))
      const amounts = items.map(item => Number(item.totalPredictAmount) || 0)
      const showZoom = categories.length > 6

      return {
        color: ['#67C23A'],
        tooltip: this.getChartTooltip({
          axisPointer: { type: 'shadow' },
          formatter: params => {
            const index = params[0]?.dataIndex ?? 0
            const item = items[index]
            if (!item) return ''
            return [
              `商品名称：${item.itemTitle}`,
              `预估佣金总额：${item.totalPredictAmount} 元`,
              `订单数量：${item.orderCount} 单`
            ].join('<br/>')
          }
        }),
        grid: {
          left: 48,
          right: 24,
          top: 40,
          bottom: showZoom ? 72 : 56,
          containLabel: true
        },
        dataZoom: showZoom ? [
          {
            type: 'slider',
            start: 0,
            end: Math.min(100, Math.round((6 / categories.length) * 100)),
            height: 18,
            bottom: 8
          },
          {
            type: 'inside',
            start: 0,
            end: Math.min(100, Math.round((6 / categories.length) * 100))
          }
        ] : [],
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            interval: 0,
            rotate: categories.length > 4 ? 35 : 25,
            fontSize: 11
          }
        },
        yAxis: {
          type: 'value',
          name: '预估佣金(元)',
          axisLabel: {
            formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
          }
        },
        series: [
          {
            name: '预估佣金总额',
            type: 'bar',
            barMaxWidth: 40,
            data: amounts
          }
        ]
      }
    },
    buildSellerChartOption(items) {
      const categories = items.map(item => this.truncateTitle(item.sellerNick, 12))
      const amounts = items.map(item => Number(item.totalAmount) || 0)
      const predictAmounts = items.map(item => Number(item.totalPredictAmount) || 0)
      const showZoom = categories.length > 8

      return {
        color: ['#409EFF', '#67C23A'],
        tooltip: this.getChartTooltip({
          axisPointer: { type: 'cross' },
          formatter: params => {
            const index = params[0]?.dataIndex ?? 0
            const item = items[index]
            if (!item) return ''
            return [
              `店铺名称：${item.sellerNick}`,
              `支付总金额：${item.totalAmount} 元`,
              `预估佣金收入：${item.totalPredictAmount} 元`,
              `订单数量：${item.orderCount} 单`
            ].join('<br/>')
          }
        }),
        legend: {
          data: ['支付总金额', '预估佣金收入'],
          top: 0
        },
        grid: {
          left: 56,
          right: 56,
          top: 64,
          bottom: showZoom ? 72 : 56,
          containLabel: true
        },
        dataZoom: showZoom ? [
          {
            type: 'slider',
            start: 0,
            end: Math.min(100, Math.round((8 / categories.length) * 100)),
            height: 18,
            bottom: 8
          },
          {
            type: 'inside',
            start: 0,
            end: Math.min(100, Math.round((8 / categories.length) * 100))
          }
        ] : [],
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            interval: 0,
            rotate: categories.length > 6 ? 30 : 0,
            fontSize: 11,
            lineHeight: 16
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '支付总金额(元)',
            axisLabel: {
              formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
            }
          },
          {
            type: 'value',
            name: '预估佣金(元)',
            splitLine: { show: false },
            axisLabel: {
              formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
            }
          }
        ],
        series: [
          {
            name: '支付总金额',
            type: 'bar',
            barMaxWidth: 36,
            data: amounts,
            yAxisIndex: 0
          },
          {
            name: '预估佣金收入',
            type: 'line',
            smooth: true,
            symbolSize: 7,
            data: predictAmounts,
            yAxisIndex: 1
          }
        ]
      }
    },
    buildHourlyChartOption(items) {
      const categories = items.map(item => item.hourLabel)
      const amounts = items.map(item => Number(item.totalAmount) || 0)
      const predictAmounts = items.map(item => Number(item.totalPredictAmount) || 0)

      return {
        color: ['#409EFF', '#E6A23C'],
        tooltip: this.getChartTooltip({
          axisPointer: { type: 'cross' },
          formatter: params => {
            const index = params[0]?.dataIndex ?? 0
            const item = items[index]
            if (!item) return ''
            return [
              `时段：${item.hourLabel}`,
              `支付总金额：${item.totalAmount} 元`,
              `预估佣金总额：${item.totalPredictAmount} 元`,
              `订单数量：${item.orderCount} 单`
            ].join('<br/>')
          }
        }),
        legend: {
          data: ['支付总金额', '预估佣金总额'],
          top: 0
        },
        grid: {
          left: 56,
          right: 56,
          top: 64,
          bottom: 48,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            interval: 0,
            rotate: 45,
            fontSize: 11
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '支付总金额(元)',
            axisLabel: {
              formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
            }
          },
          {
            type: 'value',
            name: '预估佣金(元)',
            splitLine: { show: false },
            axisLabel: {
              formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
            }
          }
        ],
        series: [
          {
            name: '支付总金额',
            type: 'bar',
            barMaxWidth: 28,
            data: amounts,
            yAxisIndex: 0
          },
          {
            name: '预估佣金总额',
            type: 'line',
            smooth: true,
            symbolSize: 6,
            data: predictAmounts,
            yAxisIndex: 1
          }
        ]
      }
    },
    buildDailyChartOption(items) {
      const categories = items.map(item => item.paidDate)
      const amounts = items.map(item => Number(item.totalAmount) || 0)
      const counts = items.map(item => Number(item.orderCount) || 0)
      const showZoom = categories.length > 14

      return {
        color: ['#409EFF', '#E6A23C'],
        tooltip: this.getChartTooltip({
          axisPointer: { type: 'cross' },
          formatter: params => {
            const index = params[0]?.dataIndex ?? 0
            const item = items[index]
            if (!item) return ''
            return [
              `支付日期：${item.paidDate}`,
              `支付总额：${item.totalAmount} 元`,
              `订单数量：${item.orderCount} 单`
            ].join('<br/>')
          }
        }),
        legend: {
          data: ['支付总额', '订单数量'],
          top: 0
        },
        grid: {
          left: 56,
          right: 56,
          top: 64,
          bottom: showZoom ? 72 : 48,
          containLabel: true
        },
        dataZoom: showZoom ? [
          {
            type: 'slider',
            start: Math.max(0, 100 - Math.round((14 / categories.length) * 100)),
            end: 100,
            height: 18,
            bottom: 8
          },
          {
            type: 'inside',
            start: Math.max(0, 100 - Math.round((14 / categories.length) * 100)),
            end: 100
          }
        ] : [],
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            interval: Math.max(0, Math.floor(categories.length / 12) - 1),
            rotate: 45,
            fontSize: 11
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '支付总额(元)',
            axisLabel: {
              formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
            }
          },
          {
            type: 'value',
            name: '订单数量(单)',
            minInterval: 1,
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: '支付总额',
            type: 'bar',
            barMaxWidth: 24,
            data: amounts,
            yAxisIndex: 0
          },
          {
            name: '订单数量',
            type: 'line',
            smooth: true,
            symbolSize: 6,
            data: counts,
            yAxisIndex: 1
          }
        ]
      }
    },
    renderChart(items) {
      this.$nextTick(() => {
        this.initCharts()
        if (!this.chartInstance) return

        this.chartHasData = items.length > 0
        if (!this.chartHasData) {
          this.chartInstance.clear()
          return
        }

        this.chartInstance.setOption(this.buildChartOption(items), true)
        this.chartInstance.resize()
      })
    },
    buildAdUserChartOption(items) {
      const categories = items.map(item => item.adUserNick)
      const amounts = items.map(item => Number(item.totalAmount) || 0)
      const predictAmounts = items.map(item => Number(item.totalPredictAmount) || 0)
      const showZoom = categories.length > 6

      return {
        color: ['#F56C6C', '#9B59B6'],
        tooltip: this.getChartTooltip({
          axisPointer: { type: 'cross' },
          formatter: params => {
            const index = params[0]?.dataIndex ?? 0
            const item = items[index]
            if (!item) return ''
            return [
              `达人昵称：${item.adUserNick}`,
              `商品总金额：${item.totalAmount} 元`,
              `预估佣金收入：${item.totalPredictAmount} 元`,
              `订单数量：${item.orderCount} 单`
            ].join('<br/>')
          }
        }),
        legend: {
          data: ['商品总金额', '预估佣金收入'],
          top: 0
        },
        grid: {
          left: 56,
          right: 56,
          top: 64,
          bottom: showZoom ? 72 : 56,
          containLabel: true
        },
        dataZoom: showZoom ? [
          {
            type: 'slider',
            start: 0,
            end: Math.min(100, Math.round((6 / categories.length) * 100)),
            height: 18,
            bottom: 8
          },
          {
            type: 'inside',
            start: 0,
            end: Math.min(100, Math.round((6 / categories.length) * 100))
          }
        ] : [],
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            interval: 0,
            rotate: categories.length > 4 ? 30 : 0,
            fontSize: 11
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '商品总金额(元)',
            axisLabel: {
              formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
            }
          },
          {
            type: 'value',
            name: '预估佣金(元)',
            splitLine: { show: false },
            axisLabel: {
              formatter: value => (value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value)
            }
          }
        ],
        series: [
          {
            name: '商品总金额',
            type: 'bar',
            barMaxWidth: 36,
            data: amounts,
            yAxisIndex: 0
          },
          {
            name: '预估佣金收入',
            type: 'line',
            smooth: true,
            symbolSize: 7,
            data: predictAmounts,
            yAxisIndex: 1
          }
        ]
      }
    },
    renderCommissionChart(dateRange, items) {
      this.$nextTick(() => {
        this.initCharts()
        if (!this.commissionChartInstance) return

        this.commissionChartDateRange = dateRange || ''
        this.commissionChartHasData = items.length > 0
        if (!this.commissionChartHasData) {
          this.commissionChartInstance.clear()
          return
        }

        this.commissionChartInstance.setOption(this.buildCommissionChartOption(items), true)
        this.commissionChartInstance.resize()
      })
    },
    renderAdUserChart(dateRange, items) {
      this.$nextTick(() => {
        this.initCharts()
        if (!this.adUserChartInstance) return

        this.adUserChartDateRange = dateRange || ''
        this.adUserChartHasData = items.length > 0
        if (!this.adUserChartHasData) {
          this.adUserChartInstance.clear()
          return
        }

        this.adUserChartInstance.setOption(this.buildAdUserChartOption(items), true)
        this.adUserChartInstance.resize()
      })
    },
    renderSellerChart(dateRange, items) {
      this.$nextTick(() => {
        this.initCharts()
        if (!this.sellerChartInstance) return

        this.sellerChartDateRange = dateRange || ''
        this.sellerChartHasData = items.length > 0
        if (!this.sellerChartHasData) {
          this.sellerChartInstance.clear()
          return
        }

        this.sellerChartInstance.setOption(this.buildSellerChartOption(items), true)
        this.sellerChartInstance.resize()
      })
    },
    renderHourlyChart(dateRange, items) {
      this.$nextTick(() => {
        this.initCharts()
        if (!this.hourlyChartInstance) return

        this.hourlyChartDateRange = dateRange || ''
        this.hourlyChartHasData = (items || []).some(item =>
          Number(item.orderCount) > 0
          || Number(item.totalAmount) > 0
          || Number(item.totalPredictAmount) > 0
        )
        if (!this.hourlyChartHasData) {
          this.hourlyChartInstance.clear()
          return
        }

        this.hourlyChartInstance.setOption(this.buildHourlyChartOption(items), true)
        this.hourlyChartInstance.resize()
      })
    },
    renderDailyChart(dateRange, items) {
      this.$nextTick(() => {
        this.initCharts()
        if (!this.dailyChartInstance) return

        this.dailyChartDateRange = dateRange || ''
        this.dailyChartHasData = (items || []).some(item =>
          Number(item.orderCount) > 0 || Number(item.totalAmount) > 0
        )
        if (!this.dailyChartHasData) {
          this.dailyChartInstance.clear()
          return
        }

        this.dailyChartInstance.setOption(this.buildDailyChartOption(items), true)
        this.dailyChartInstance.resize()
      })
    },
    handleResize() {
      if (this.chartInstance) {
        this.chartInstance.resize()
      }
      if (this.commissionChartInstance) {
        this.commissionChartInstance.resize()
      }
      if (this.adUserChartInstance) {
        this.adUserChartInstance.resize()
      }
      if (this.sellerChartInstance) {
        this.sellerChartInstance.resize()
      }
      if (this.hourlyChartInstance) {
        this.hourlyChartInstance.resize()
      }
      if (this.dailyChartInstance) {
        this.dailyChartInstance.resize()
      }
    },
    async loadMeta() {
      try {
        const res = await fetchOrderStatuses()
        this.orderStatusOptions = res.items || []
      } catch (error) {
        this.$message.error(error.message)
      }
    },
    async loadStats() {
      this.statsLoading = true
      try {
        const res = await fetchLiveOverviewStats(this.buildStatsParams())
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
    async handleExport() {
      const params = this.buildStatsParams()
      if (!params.startDate || !params.endDate) {
        this.$message.warning('请选择支付日期范围后再导出')
        return
      }

      this.exportLoading = true
      try {
        const { blob, filename } = await downloadLiveOverviewExport(params)
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
    },
    async loadChart() {
      this.chartLoading = true
      try {
        const res = await fetchLiveOverviewProductChart(this.buildFilterParams())
        this.renderChart(res.items || [])
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.chartLoading = false
      }
    },
    async loadCommissionChart() {
      this.commissionChartLoading = true
      try {
        const res = await fetchProductCommissionChart(this.buildFilterParams())
        this.renderCommissionChart(res.dateRange, res.items || [])
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.commissionChartLoading = false
      }
    },
    async loadAdUserChart() {
      this.adUserChartLoading = true
      try {
        const res = await fetchAdUserAmountChart(this.buildFilterParams())
        this.renderAdUserChart(res.dateRange, res.items || [])
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.adUserChartLoading = false
      }
    },
    async loadSellerChart() {
      this.sellerChartLoading = true
      try {
        const res = await fetchSellerAmountChart(this.buildFilterParams())
        this.renderSellerChart(res.dateRange, res.items || [])
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.sellerChartLoading = false
      }
    },
    async loadHourlyChart() {
      this.hourlyChartLoading = true
      try {
        const res = await fetchHourlyAmountChart(this.buildFilterParams())
        this.renderHourlyChart(res.dateRange, res.items || [])
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.hourlyChartLoading = false
      }
    },
    async loadDailyChart() {
      this.dailyChartLoading = true
      try {
        const res = await fetchDailyAmountChart(this.buildDailyChartParams())
        this.renderDailyChart(res.dateRange, res.items || [])
      } catch (error) {
        this.$message.error(error.message)
      } finally {
        this.dailyChartLoading = false
      }
    },
    async loadList() {
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
    handleSearch() {
      this.pagination.page = 1
      this.loadChart()
      this.loadCommissionChart()
      this.loadAdUserChart()
      this.loadSellerChart()
      this.loadHourlyChart()
      this.loadDailyChart()
      this.loadList()
    },
    resetFilters() {
      this.filters = {
        loginUserName: '',
        adUserNick: '',
        sellerNick: '',
        itemTitle: '',
        orderStatus: '',
        dateRange: getDefaultDateRange()
      }
      this.pagination.page = 1
      this.loadChart()
      this.loadCommissionChart()
      this.loadAdUserChart()
      this.loadSellerChart()
      this.loadHourlyChart()
      this.loadDailyChart()
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
    }
  }
}
</script>

<style scoped>
.stats-filter-card,
.stats-row {
  margin-bottom: 16px;
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

.stats-filter-card ::v-deep .el-card__body {
  padding-bottom: 2px;
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

.filter-card,
.charts-row,
.chart-card {
  margin-bottom: 16px;
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

.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}
</style>
