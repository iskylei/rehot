function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = String(value).replace(/[%,¥,\s]/g, '')
  const num = Number.parseFloat(normalized)
  return Number.isNaN(num) ? 0 : num
}

function parseRatio(value) {
  if (value === null || value === undefined || value === '') return null
  const normalized = String(value).replace(/%/g, '').trim()
  const num = Number.parseFloat(normalized)
  return Number.isNaN(num) ? null : num
}

function formatAmount(value, digits = 2) {
  return parseAmount(value).toFixed(digits)
}

function formatRatio(value, digits = 2) {
  const ratio = parseRatio(value)
  if (ratio === null) return '-'
  return `${ratio.toFixed(digits)}%`
}

function getTodayRange() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const day = `${yyyy}-${mm}-${dd}`
  return { start: day, end: `${day} 23:59:59` }
}

function getMonthRange() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate()
  return {
    start: `${yyyy}-${mm}-01`,
    end: `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')} 23:59:59`
  }
}

module.exports = {
  parseAmount,
  parseRatio,
  formatAmount,
  formatRatio,
  getTodayRange,
  getMonthRange
}
