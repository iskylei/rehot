const express = require('express')
const { mapSysTbOrder } = require('../db')
const { authRequired, permissionRequired } = require('../middleware/auth')
const { ORDER_STATUS_OPTIONS } = require('../constants/tbOrderStatus')
const {
  fetchRowsPaged,
  calcGlobalOverview,
  calcProductChartStats,
  calcProductCommissionStats,
  calcAdUserAmountStats,
  calcSellerAmountStats,
  calcHourlyAmountStats,
  calcDailyAmountStats
} = require('../services/tbOrderQuery')
const { buildLiveOverviewExcelBuffer } = require('../services/liveOverviewExport')
const { formatAmount, formatRatio } = require('../utils/amount')

const router = express.Router()

router.use(authRequired, permissionRequired('tb_order:view'))

router.get('/stats', async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query
    const stats = await calcGlobalOverview({ startDate, endDate })
    res.json({
      stats: {
        totalOrderAmount: formatAmount(stats.totalOrderAmount),
        todayOrderAmount: formatAmount(stats.todayOrderAmount),
        monthOrderAmount: formatAmount(stats.monthOrderAmount),
        totalRefundAmount: formatAmount(stats.totalRefundAmount),
        totalPredictAmount: formatAmount(stats.totalPredictAmount),
        avgCommissionRatio: formatRatio(stats.avgCommissionRatio),
        latestPaidTime: stats.latestPaidTime || '-'
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/order-statuses', (req, res) => {
  res.json({ items: ORDER_STATUS_OPTIONS })
})

router.get('/product-chart', async (req, res) => {
  try {
    const {
      loginUserName = '',
      adUserNick = '',
      sellerNick = '',
      itemTitle = '',
      orderStatus = '',
      startDate = '',
      endDate = ''
    } = req.query

    const items = (await calcProductChartStats({
      loginUserName,
      adUserNick,
      sellerNick,
      itemTitle,
      orderStatus,
      startDate,
      endDate
    })).map(item => ({
      paidDate: item.paidDate,
      itemTitle: item.itemTitle,
      orderCount: item.orderCount,
      totalAmount: formatAmount(item.totalAmount)
    }))

    res.json({ items })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/product-commission-chart', async (req, res) => {
  try {
    const {
      loginUserName = '',
      adUserNick = '',
      sellerNick = '',
      itemTitle = '',
      orderStatus = '',
      startDate = '',
      endDate = ''
    } = req.query

    const result = await calcProductCommissionStats({
      loginUserName,
      adUserNick,
      sellerNick,
      itemTitle,
      orderStatus,
      startDate,
      endDate
    })

    res.json({
      startDate: result.startDate,
      endDate: result.endDate,
      dateRange: result.dateRange,
      items: result.items.map(item => ({
        itemTitle: item.itemTitle,
        orderCount: item.orderCount,
        totalPredictAmount: formatAmount(item.totalPredictAmount)
      }))
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/ad-user-amount-chart', async (req, res) => {
  try {
    const {
      loginUserName = '',
      adUserNick = '',
      sellerNick = '',
      itemTitle = '',
      orderStatus = '',
      startDate = '',
      endDate = ''
    } = req.query

    const result = await calcAdUserAmountStats({
      loginUserName,
      adUserNick,
      sellerNick,
      itemTitle,
      orderStatus,
      startDate,
      endDate
    })

    res.json({
      startDate: result.startDate,
      endDate: result.endDate,
      dateRange: result.dateRange,
      items: result.items.map(item => ({
        adUserNick: item.adUserNick,
        orderCount: item.orderCount,
        totalAmount: formatAmount(item.totalAmount),
        totalPredictAmount: formatAmount(item.totalPredictAmount)
      }))
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/seller-amount-chart', async (req, res) => {
  try {
    const {
      loginUserName = '',
      adUserNick = '',
      sellerNick = '',
      itemTitle = '',
      orderStatus = '',
      startDate = '',
      endDate = ''
    } = req.query

    const result = await calcSellerAmountStats({
      loginUserName,
      adUserNick,
      sellerNick,
      itemTitle,
      orderStatus,
      startDate,
      endDate
    })

    res.json({
      startDate: result.startDate,
      endDate: result.endDate,
      dateRange: result.dateRange,
      items: result.items.map(item => ({
        sellerNick: item.sellerNick,
        orderCount: item.orderCount,
        totalAmount: formatAmount(item.totalAmount),
        totalPredictAmount: formatAmount(item.totalPredictAmount)
      }))
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/hourly-amount-chart', async (req, res) => {
  try {
    const {
      loginUserName = '',
      adUserNick = '',
      sellerNick = '',
      itemTitle = '',
      orderStatus = '',
      startDate = '',
      endDate = ''
    } = req.query

    const result = await calcHourlyAmountStats({
      loginUserName,
      adUserNick,
      sellerNick,
      itemTitle,
      orderStatus,
      startDate,
      endDate
    })

    res.json({
      startDate: result.startDate,
      endDate: result.endDate,
      dateRange: result.dateRange,
      items: result.items.map(item => ({
        hour: item.hour,
        hourLabel: item.hourLabel,
        orderCount: item.orderCount,
        totalAmount: formatAmount(item.totalAmount),
        totalPredictAmount: formatAmount(item.totalPredictAmount)
      }))
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/daily-amount-chart', async (req, res) => {
  try {
    const {
      loginUserName = '',
      adUserNick = '',
      sellerNick = '',
      itemTitle = '',
      orderStatus = ''
    } = req.query

    const result = await calcDailyAmountStats({
      loginUserName,
      adUserNick,
      sellerNick,
      itemTitle,
      orderStatus
    })

    res.json({
      startDate: result.startDate,
      endDate: result.endDate,
      dateRange: result.dateRange,
      items: result.items.map(item => ({
        paidDate: item.paidDate,
        orderCount: item.orderCount,
        totalAmount: formatAmount(item.totalAmount)
      }))
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/export', async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请选择支付日期范围后再导出' })
    }

    const { buffer, rowCount, filename } = await buildLiveOverviewExcelBuffer({
      startDate,
      endDate
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    )
    res.setHeader('X-Export-Row-Count', String(rowCount))
    res.send(buffer)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/orders', async (req, res) => {
  try {
    const {
      loginUserName = '',
      adUserNick = '',
      sellerNick = '',
      itemTitle = '',
      orderStatus = '',
      startDate = '',
      endDate = '',
      page = '1',
      pageSize = '20'
    } = req.query

    const { rows, total, page: pageNum, pageSize: sizeNum } = await fetchRowsPaged({
      loginUserName,
      adUserNick,
      sellerNick,
      itemTitle,
      orderStatus,
      startDate,
      endDate
    }, page, pageSize)

    res.json({
      items: rows.map(mapSysTbOrder),
      total,
      page: pageNum,
      pageSize: sizeNum
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
