const express = require('express')
const appStore = require('../services/appStore')

const router = express.Router()

router.get('/overview', async (req, res) => {
  try {
    const totalRow = await appStore.queryOne('SELECT COUNT(*) AS count FROM heat_waves')
    const activeRow = await appStore.queryOne("SELECT COUNT(*) AS count FROM heat_waves WHERE status = 'active'")
    const plannedRow = await appStore.queryOne("SELECT COUNT(*) AS count FROM heat_waves WHERE status = 'planned'")
    const endedRow = await appStore.queryOne("SELECT COUNT(*) AS count FROM heat_waves WHERE status = 'ended'")
    const maxTempRow = await appStore.queryOne('SELECT MAX(max_temperature) AS value FROM heat_waves')

    const alertDistribution = await appStore.queryAll(`
      SELECT alert_level AS level, COUNT(*) AS count
      FROM heat_waves
      GROUP BY alert_level
      ORDER BY
        CASE alert_level
          WHEN 'red' THEN 1
          WHEN 'orange' THEN 2
          WHEN 'yellow' THEN 3
          WHEN 'blue' THEN 4
          ELSE 5
        END
    `)

    const regionTop = await appStore.queryAll(`
      SELECT region, COUNT(*) AS count, MAX(max_temperature) AS maxTemperature
      FROM heat_waves
      GROUP BY region
      ORDER BY count DESC, maxTemperature DESC
      LIMIT 5
    `)

    const recentRows = await appStore.queryAll(`
      SELECT id, name, region, city, max_temperature, alert_level, status, start_date
      FROM heat_waves
      ORDER BY updated_at DESC
      LIMIT 5
    `)

    res.json({
      total: Number(totalRow?.count) || 0,
      active: Number(activeRow?.count) || 0,
      planned: Number(plannedRow?.count) || 0,
      ended: Number(endedRow?.count) || 0,
      maxTemperature: maxTempRow?.value || 0,
      alertDistribution,
      regionTop,
      recent: recentRows.map(row => ({
        id: row.id,
        name: row.name,
        region: row.region,
        city: row.city,
        maxTemperature: row.max_temperature,
        alertLevel: row.alert_level,
        status: row.status,
        startDate: row.start_date
      }))
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
