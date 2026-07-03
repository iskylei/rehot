const XLSX = require('xlsx')
const { normalizeImportDateTime, looksLikeDateTimeValue } = require('../utils/importDateTime')
const { resolveImportFieldKey } = require('../constants/tbOrderFields')

function isDateTimeField(header) {
  const normalizedKey = resolveImportFieldKey(header)
  return normalizedKey === 'createTime' || normalizedKey === 'orderPaidTime'
}

function getCellRawValue(cell) {
  if (!cell) return ''
  if (cell.v instanceof Date) return cell.v
  if (cell.t === 'd') return cell.v
  if (cell.t === 'n' && typeof cell.v === 'number') return cell.v
  if (cell.w != null && String(cell.w).trim() !== '') return String(cell.w).trim()
  if (cell.v == null) return ''
  return cell.v
}

function getCellValue(cell, header = '') {
  const rawValue = getCellRawValue(cell)
  if (rawValue === '') return ''

  if (isDateTimeField(header) || looksLikeDateTimeValue(rawValue)) {
    const normalized = normalizeImportDateTime(rawValue)
    if (normalized) return normalized
  }

  return String(rawValue).trim()
}

function parseExcelSheet(sheet) {
  if (!sheet || !sheet['!ref']) return []

  const range = XLSX.utils.decode_range(sheet['!ref'])
  const headers = []

  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })]
    const header = cell ? String(cell.w ?? cell.v ?? '').trim().replace(/^\uFEFF/, '') : ''
    headers.push(header)
  }

  const rows = []
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const record = {}
    let hasValue = false

    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const header = headers[col - range.s.c]
      if (!header) continue

      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })]
      const value = getCellValue(cell, header)
      if (value) hasValue = true
      record[header] = value
    }

    if (hasValue) rows.push(record)
  }

  return rows
}

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  return parseExcelSheet(workbook.Sheets[sheetName])
}

module.exports = {
  isDateTimeField,
  getCellValue,
  parseExcelSheet,
  parseExcelBuffer
}
