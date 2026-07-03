import * as XLSX from 'xlsx'

const DATE_TIME_PATTERNS = [
  /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/,
  /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  /^(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
]

const DATE_TIME_HEADERS = new Set([
  'order paid time',
  'order_paid_time',
  'create time',
  'create_time',
  '支付日期',
  '支付时间',
  '创建时间'
])

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatDateTimeParts(year, month, day, hour = 0, minute = 0, second = 0) {
  return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
}

function formatDateObject(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return formatDateTimeParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  )
}

function formatExcelSerial(serial) {
  if (!Number.isFinite(serial)) return ''
  const parsed = XLSX.SSF.parse_date_code(serial)
  if (!parsed) return ''
  return formatDateTimeParts(
    parsed.y,
    parsed.m,
    parsed.d,
    parsed.H || 0,
    parsed.M || 0,
    Math.round(parsed.S || 0)
  )
}

function looksLikeExcelSerial(value) {
  return Number.isFinite(value) && value >= 1 && value < 120000
}

export function looksLikeDateTimeValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return false
  return /^\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(text)
    || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)
    || /^\d{4}年\d{1,2}月\d{1,2}日/.test(text)
}

export function normalizeImportDateTime(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return formatDateObject(value)
  if (typeof value === 'number') {
    return looksLikeExcelSerial(value) ? formatExcelSerial(value) : ''
  }

  let text = String(value).trim().replace(/\u00A0/g, ' ')
  if (!text) return ''

  if (/^\d+(\.\d+)?[eE][+-]?\d+$/.test(text)) {
    const serial = Number(text)
    const converted = formatExcelSerial(serial)
    if (converted) return converted
  }

  const numeric = Number(text)
  if (/^\d+(\.\d+)?$/.test(text) && looksLikeExcelSerial(numeric)) {
    const converted = formatExcelSerial(numeric)
    if (converted) return converted
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/)
  if (isoMatch) {
    const [, year, month, day, hour, minute, second = '0'] = isoMatch
    return formatDateTimeParts(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  }

  for (const pattern of DATE_TIME_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue

    if (pattern.source.startsWith('^(\\d{1,2})\\/')) {
      const [, month, day, year, hour = '0', minute = '0', second = '0'] = match
      return formatDateTimeParts(
        Number(year),
        Number(month),
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    }

    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
    return formatDateTimeParts(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  }

  const parsed = new Date(text.includes('/') ? text : text.replace(/-/g, '/'))
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateObject(parsed)
  }

  return text
}

function normalizeHeaderText(header) {
  return String(header || '').trim().replace(/^\uFEFF/, '').replace(/\s+/g, ' ').toLowerCase()
}

export function isDateTimeHeader(header) {
  const key = normalizeHeaderText(header)
  if (DATE_TIME_HEADERS.has(key)) return true
  return /^order[\s_-]*paid[\s_-]*time$/.test(key)
    || /^create[\s_-]*time$/.test(key)
    || key === '支付日期'
    || key === '支付时间'
}
