function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  result.push(current.trim())
  return result
}

export function parseCsv(text) {
  const content = String(text || '').replace(/^\uFEFF/, '').trim()
  if (!content) return []

  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i])
    if (values.every(value => !value)) continue

    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    rows.push(row)
  }

  return rows
}
