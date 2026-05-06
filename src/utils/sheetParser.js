/**
 * Converts a Google Sheets URL to a CSV export URL
 * Supports both full sheet URLs and shortened URLs
 */
function convertToCSVUrl(sheetUrl) {
  // Remove any # fragments and query params for parsing
  const cleanUrl = sheetUrl.split('#')[0].split('?')[0]
  
  // Extract sheet ID from various Google Sheets URL formats
  const sheetIdMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
  
  if (!sheetIdMatch) {
    throw new Error('Invalid Google Sheets URL. Please use a URL like: https://docs.google.com/spreadsheets/d/SHEET_ID/...')
  }

  const sheetId = sheetIdMatch[1]
  
  // Use the export URL with gid=0 for the first sheet
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`
}

/**
 * Fetches CSV data using a CORS-friendly approach with proxy fallback
 */
async function fetchCSVWithCORS(csvUrl) {
  // Try direct fetch first
  try {
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
    })

    if (response.ok) {
      return await response.text()
    }

    if (response.status === 404) {
      throw new Error('Sheet not found (404). Make sure the sheet ID is correct.')
    }

    if (response.status === 403) {
      throw new Error('Access denied (403). The sheet might not be publicly shared.')
    }
  } catch (error) {
    if (!error.message.includes('not found') && !error.message.includes('Access denied')) {
      // Try with CORS proxy as fallback
      try {
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${csvUrl}`
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv',
          },
        })

        if (response.ok) {
          return await response.text()
        }
      } catch (proxyError) {
        // Fall through to error handling
      }
    }
  }

  // If both methods fail, throw a helpful error
  throw new Error(
    'Unable to fetch sheet data. Make sure your Google Sheet is publicly accessible ' +
    '(shared with "Anyone with the link").\n\n' +
    'If the sheet is private, you can:\n' +
    '1. Export it as CSV from Google Sheets\n' +
    '2. Upload it to a public service like GitHub or Pastebin\n' +
    '3. Use the public file link with Cardify'
  )
}

/**
 * Parses CSV text into headers and rows
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  
  if (lines.length === 0) {
    throw new Error('Sheet is empty')
  }

  // Parse headers (first row)
  const headers = parseCSVLine(lines[0])

  // Parse data rows (remaining rows)
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((header, colIndex) => {
      row[header] = values[colIndex] || ''
    })
    return row
  })

  return { headers, rows }
}

/**
 * Parses a single CSV line, handling quoted values and commas
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  result.push(current.trim())

  return result
}

/**
 * Fetches data from a Google Sheets CSV export URL
 * @param {string} sheetUrl - Google Sheets URL
 * @returns {Promise<{headers: string[], rows: object[]}>}
 */
export async function fetchSheetData(sheetUrl) {
  try {
    if (!sheetUrl || !sheetUrl.trim()) {
      throw new Error('Please enter a valid Google Sheets URL')
    }

    const csvUrl = convertToCSVUrl(sheetUrl)
    const csvText = await fetchCSVWithCORS(csvUrl)
    const { headers, rows } = parseCSV(csvText)

    if (rows.length === 0) {
      throw new Error('Sheet contains headers but no data rows')
    }

    return { headers, rows }
  } catch (error) {
    // Re-throw with meaningful error messages
    if (error.message.includes('Failed to parse')) {
      throw new Error('Could not parse sheet data. Make sure it is a valid CSV or Google Sheet.')
    }
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Check your connection and URL.')
    }
    throw error
  }
}
