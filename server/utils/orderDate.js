function getTodayDateString() {
  const today = new Date()
  return formatDateString(today)
}

function formatDateString(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getLast60DaysRange() {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 59)
  return {
    startDate: formatDateString(startDate),
    endDate: formatDateString(endDate)
  }
}

function normalizePaidTimeToToday(paidTime) {
  const today = getTodayDateString()
  if (!paidTime || typeof paidTime !== 'string') {
    return `${today} 12:00:00`
  }
  const parts = paidTime.trim().split(' ')
  const timePart = parts[1] || '12:00:00'
  return `${today} ${timePart}`
}

module.exports = {
  getTodayDateString,
  formatDateString,
  getLast60DaysRange,
  normalizePaidTimeToToday
}
