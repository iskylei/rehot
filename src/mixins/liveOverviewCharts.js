import * as echarts from 'echarts'
import {
  fetchOrderStatuses,
  fetchLiveOverviewProductChart,
  fetchProductCommissionChart,
  fetchAdUserAmountChart,
  fetchSellerAmountChart,
  fetchHourlyAmountChart,
  fetchDailyAmountChart
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
  data() {
    return {
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
      orderStatusOptions: [],
      chartFilters: {
        adUserNick: '',
        sellerNick: '',
        itemTitle: '',
        orderStatus: '',
        dateRange: getDefaultDateRange()
      }
    }
  },
  methods: {
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
      const sortedItems = [...items].sort((a, b) => {
        const amountDiff = (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0)
        if (amountDiff !== 0) return amountDiff
        const dateDiff = String(b.paidDate).localeCompare(String(a.paidDate))
        if (dateDiff !== 0) return dateDiff
        return String(a.itemTitle).localeCompare(String(b.itemTitle), 'zh-CN')
      })
      const categories = sortedItems.map(item => `${item.paidDate}\n${this.truncateTitle(item.itemTitle)}`)
      const amounts = sortedItems.map(item => Number(item.totalAmount) || 0)
      const counts = sortedItems.map(item => Number(item.orderCount) || 0)
      const showZoom = categories.length > 8

      return {
        color: ['#409EFF', '#E6A23C'],
        tooltip: this.getChartTooltip({
          axisPointer: { type: 'cross' },
          formatter: params => {
            const index = params[0]?.dataIndex ?? 0
            const item = sortedItems[index]
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
    async loadChart() {
      this.chartLoading = true
      try {
        const res = await fetchLiveOverviewProductChart(this.buildChartFilterParams())
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
        const res = await fetchProductCommissionChart(this.buildChartFilterParams())
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
        const res = await fetchAdUserAmountChart(this.buildChartFilterParams())
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
        const res = await fetchSellerAmountChart(this.buildChartFilterParams())
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
        const res = await fetchHourlyAmountChart(this.buildChartFilterParams())
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
    buildDailyChartParams() {
      const base = this.buildChartFilterParams()
      return {
        orgName: base.orgName,
        adUserNick: base.adUserNick,
        sellerNick: base.sellerNick,
        itemTitle: base.itemTitle,
        orderStatus: base.orderStatus
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
    loadAllCharts() {
      this.loadChart()
      this.loadCommissionChart()
      this.loadAdUserChart()
      this.loadSellerChart()
      this.loadHourlyChart()
      this.loadDailyChart()
    },
    handleChartSearch() {
      this.loadAllCharts()
    },
    resetChartFilters() {
      this.chartFilters = {
        adUserNick: '',
        sellerNick: '',
        itemTitle: '',
        orderStatus: '',
        dateRange: getDefaultDateRange()
      }
      this.loadAllCharts()
    }
  }
}
