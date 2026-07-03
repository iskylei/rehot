import * as XLSX from 'xlsx'
import { isDateTimeHeader, looksLikeDateTimeValue, normalizeImportDateTime } from '@/utils/importDateTime'

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

  if (isDateTimeHeader(header) || looksLikeDateTimeValue(rawValue)) {
    const normalized = normalizeImportDateTime(rawValue)
    if (normalized) return normalized
  }

  return String(rawValue).trim()
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = event => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          resolve([])
          return
        }

        const sheet = workbook.Sheets[sheetName]
        if (!sheet || !sheet['!ref']) {
          resolve([])
          return
        }

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

        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}
