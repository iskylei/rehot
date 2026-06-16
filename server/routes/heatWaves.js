const express = require('express')
const appStore = require('../services/appStore')
const { mapHeatWave, ALERT_LEVELS, STATUSES } = require('../db')
const { authRequired, permissionRequired } = require('../middleware/auth')

const router = express.Router()

router.use(authRequired, permissionRequired('heat_wave:view'))

function validateHeatWave(payload, isUpdate = false) {
  const errors = []
  const requiredFields = isUpdate
    ? []
    : ['name', 'region', 'city', 'maxTemperature', 'alertLevel', 'status', 'startDate']

  requiredFields.forEach(field => {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      errors.push(`${field} 不能为空`)
    }
  })

  if (payload.maxTemperature !== undefined && Number.isNaN(Number(payload.maxTemperature))) {
    errors.push('最高温度必须为数字')
  }

  if (payload.alertLevel && !ALERT_LEVELS.includes(payload.alertLevel)) {
    errors.push('预警等级无效')
  }

  if (payload.status && !STATUSES.includes(payload.status)) {
    errors.push('状态无效')
  }

  return errors
}

router.get('/', async (req, res) => {
  try {
    const { keyword = '', status = '', alertLevel = '' } = req.query
    let sql = 'SELECT * FROM heat_waves WHERE 1=1'
    const params = []

    if (keyword) {
      sql += ' AND (name LIKE ? OR region LIKE ? OR city LIKE ?)'
      const like = `%${keyword}%`
      params.push(like, like, like)
    }

    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    if (alertLevel) {
      sql += ' AND alert_level = ?'
      params.push(alertLevel)
    }

    sql += ' ORDER BY start_date DESC, id DESC'
    const rows = await appStore.queryAll(sql, params)
    res.json({ items: rows.map(mapHeatWave) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await appStore.queryOne('SELECT * FROM heat_waves WHERE id = ?', [req.params.id])
    if (!row) {
      return res.status(404).json({ message: '热浪记录不存在' })
    }
    res.json({ item: mapHeatWave(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/', permissionRequired('heat_wave:manage'), async (req, res) => {
  try {
    const payload = req.body || {}
    const errors = validateHeatWave(payload)
    if (errors.length) {
      return res.status(400).json({ message: errors.join('；') })
    }

    const result = await appStore.execute(
      `INSERT INTO heat_waves (
        name, region, city, max_temperature, alert_level, status, start_date, end_date, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.name,
        payload.region,
        payload.city,
        Number(payload.maxTemperature),
        payload.alertLevel,
        payload.status,
        payload.startDate,
        payload.endDate || '',
        payload.description || ''
      ]
    )

    const row = await appStore.queryOne(
      'SELECT * FROM heat_waves WHERE id = ?',
      [appStore.getLastInsertId(result)]
    )
    res.status(201).json({ item: mapHeatWave(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/:id', permissionRequired('heat_wave:manage'), async (req, res) => {
  try {
    const existing = await appStore.queryOne('SELECT * FROM heat_waves WHERE id = ?', [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '热浪记录不存在' })
    }

    const payload = req.body || {}
    const errors = validateHeatWave(payload, true)
    if (errors.length) {
      return res.status(400).json({ message: errors.join('；') })
    }

    const next = {
      name: payload.name ?? existing.name,
      region: payload.region ?? existing.region,
      city: payload.city ?? existing.city,
      max_temperature: payload.maxTemperature !== undefined ? Number(payload.maxTemperature) : existing.max_temperature,
      alert_level: payload.alertLevel ?? existing.alert_level,
      status: payload.status ?? existing.status,
      start_date: payload.startDate ?? existing.start_date,
      end_date: payload.endDate !== undefined ? payload.endDate : existing.end_date,
      description: payload.description !== undefined ? payload.description : existing.description
    }
    const now = appStore.currentTimestamp()

    await appStore.execute(
      `UPDATE heat_waves
       SET name = ?, region = ?, city = ?, max_temperature = ?, alert_level = ?,
           status = ?, start_date = ?, end_date = ?, description = ?, updated_at = ?
       WHERE id = ?`,
      [
        next.name,
        next.region,
        next.city,
        next.max_temperature,
        next.alert_level,
        next.status,
        next.start_date,
        next.end_date,
        next.description,
        now,
        req.params.id
      ]
    )

    const row = await appStore.queryOne('SELECT * FROM heat_waves WHERE id = ?', [req.params.id])
    res.json({ item: mapHeatWave(row) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', permissionRequired('heat_wave:manage'), async (req, res) => {
  try {
    const existing = await appStore.queryOne('SELECT id FROM heat_waves WHERE id = ?', [req.params.id])
    if (!existing) {
      return res.status(404).json({ message: '热浪记录不存在' })
    }

    await appStore.execute('DELETE FROM heat_waves WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
