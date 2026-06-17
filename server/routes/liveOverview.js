const express = require('express')
const { mapSysTbOrder } = require('../db')
const { authRequired } = require('../middleware/auth')
const { liveOverviewAccessRequired } = require('../middleware/liveOverviewAccess')
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
const { resolveOrderFilters } = require('../utils/orderFilters')

const router = express.Router()

router.get('/stats', authRequired, liveOverviewAccessRequired({ scope: 'global' }), async (req, res) => {
  try {
    const { startDate = '', endDate = '' } = req.query
    const stats = await calcGlobalOverview({ startDate, endDate })
    res.json({
      stats: {
        totalOrderAmount: formatAmount(stats.totalOrderAmount),
        todayOrderAmount: formatAmount(stats.todayOrderAmount),
        todayPredictAmount: formatAmount(stats.todayPredictAmount),
        todayRefundAmount: formatAmount(stats.todayRefundAmount),
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

router.get('/org-stats', authRequired, liveOverviewAccessRequired({ scope: 'org' }), async (req, res) => {
  try {
    const { orgName = '', startDate = '', endDate = '' } = req.query
    const scopedLoginUserName = String(orgName).trim()

    if (!scopedLoginUserName) {
      return res.status(400).json({ message: '请指定机构名称' })
    }

    const stats = await calcGlobalOverview({
      startDate,
      endDate,
      scopedLoginUserName
    })
    res.json({
      orgName: scopedLoginUserName,
      stats: {
        totalOrderAmount: formatAmount(stats.totalOrderAmount),
        todayOrderAmount: formatAmount(stats.todayOrderAmount),
        todayPredictAmount: formatAmount(stats.todayPredictAmount),
        todayRefundAmount: formatAmount(stats.todayRefundAmount),
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

router.get('/order-statuses', authRequired, liveOverviewAccessRequired({ scope: 'org-capable' }), (req, res) => {
  res.json({ items: ORDER_STATUS_OPTIONS })
})

router.get('/product-chart', authRequired, liveOverviewAccessRequired(), async (req, res) => {
  try {
    const items = (await calcProductChartStats(resolveOrderFilters(req.query))).map(item => ({
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

router.get('/product-commission-chart', authRequired, liveOverviewAccessRequired(), async (req, res) => {
  try {
    const result = await calcProductCommissionStats(resolveOrderFilters(req.query))

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

router.get('/ad-user-amount-chart', authRequired, liveOverviewAccessRequired(), async (req, res) => {
  try {
    const result = await calcAdUserAmountStats(resolveOrderFilters(req.query))

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

router.get('/seller-amount-chart', authRequired, liveOverviewAccessRequired(), async (req, res) => {
  try {
    const result = await calcSellerAmountStats(resolveOrderFilters(req.query))

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

router.get('/hourly-amount-chart', authRequired, liveOverviewAccessRequired(), async (req, res) => {
  try {
    const result = await calcHourlyAmountStats(resolveOrderFilters(req.query))

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

router.get('/daily-amount-chart', authRequired, liveOverviewAccessRequired(), async (req, res) => {
  try {
    const result = await calcDailyAmountStats(resolveOrderFilters(req.query))

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

router.get('/export', authRequired, liveOverviewAccessRequired({ scope: 'global' }), async (req, res) => {
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

router.get('/org-export', authRequired, liveOverviewAccessRequired({ scope: 'org' }), async (req, res) => {
  try {
    const { orgName = '', startDate = '', endDate = '' } = req.query
    const scopedLoginUserName = String(orgName).trim()

    if (!scopedLoginUserName) {
      return res.status(400).json({ message: '请指定机构名称' })
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请选择支付日期范围后再导出' })
    }

    const { buffer, rowCount, filename } = await buildLiveOverviewExcelBuffer({
      startDate,
      endDate,
      scopedLoginUserName
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

router.get('/orders', authRequired, liveOverviewAccessRequired(), async (req, res) => {
  try {
    const {
      page = '1',
      pageSize = '20'
    } = req.query

    const { rows, total, page: pageNum, pageSize: sizeNum } = await fetchRowsPaged(
      resolveOrderFilters(req.query),
      page,
      pageSize
    )

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
