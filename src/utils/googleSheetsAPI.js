const CLIENT_ID = '476752245108-onu4bhbmvdia5dujr0867npsjtdv947k.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly'

let tokenClient = null
let accessToken = null
let tokenClientInitialized = false
let tokenRequestResolve = null
let tokenRequestReject = null

/**
 * Extract spreadsheet ID from various formats
 * Handles: direct ID, full URL, or object with id property
 */
function extractSpreadsheetId(input) {
  if (!input) {
    throw new Error('Spreadsheet ID cannot be empty')
  }

  // If it's already a simple ID (alphanumeric, hyphens, underscores)
  if (typeof input === 'string' && /^[a-zA-Z0-9-_]+$/.test(input)) {
    return input
  }

  // If it's an object with id property
  if (typeof input === 'object' && input.id) {
    return extractSpreadsheetId(input.id)
  }

  // If it's a URL, extract the ID from it
  if (typeof input === 'string' && input.includes('/')) {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match && match[1]) {
      return match[1]
    }
  }

  throw new Error(`Invalid spreadsheet ID format: ${input}`)
}

/**
 * Initialize Google Sign-In
 */
export function initializeGoogle() {
  return new Promise((resolve, reject) => {
    // Check if already initialized
    if (tokenClientInitialized) {
      console.log('[Cardify] Google token client already initialized')
      resolve(true)
      return
    }

    const startedAt = Date.now()

    const tryInitialize = () => {
      const oauth = window.google?.accounts?.oauth2

      if (!oauth) {
        if (Date.now() - startedAt >= 10000) {
          console.error('[Cardify] Google Identity Services not loaded')
          reject(new Error('Google Identity Services not loaded. Please refresh the page.'))
          return
        }

        setTimeout(tryInitialize, 100)
        return
      }

      try {
        // Create token client for getting access token
        tokenClient = oauth.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            console.log('[Cardify] Token request callback received')
            if (response.access_token) {
              accessToken = response.access_token
              console.log('[Cardify] Access token obtained successfully')
              if (tokenRequestResolve) {
                tokenRequestResolve(response)
                tokenRequestResolve = null
                tokenRequestReject = null
              }
            } else {
              const message = response.error_description || response.error || 'Failed to get access token'
              console.error('[Cardify] No access token in response:', message)
              if (tokenRequestReject) {
                tokenRequestReject(new Error(message))
                tokenRequestResolve = null
                tokenRequestReject = null
              }
            }
          },
          error_callback: (error) => {
            console.error('[Cardify] Token client error:', error)
            if (tokenRequestReject) {
              tokenRequestReject(error instanceof Error ? error : new Error(error.message || 'Google sign-in failed'))
              tokenRequestResolve = null
              tokenRequestReject = null
            }
          },
        })

        tokenClientInitialized = true
        console.log('[Cardify] Google token client initialized successfully')
        resolve(true)
      } catch (error) {
        console.error('[Cardify] Failed to initialize token client:', error)
        reject(error)
      }
    }

    tryInitialize()
  })
}

/**
 * Request access token from user
 */
export function requestAccessToken() {
  return new Promise((resolve, reject) => {
    console.log('[Cardify] Requesting access token. Initialized:', tokenClientInitialized, 'Has client:', !!tokenClient)

    if (!tokenClientInitialized || !tokenClient) {
      const error = 'Token client not initialized. Call initializeGoogle() first.'
      console.error('[Cardify]', error)
      reject(new Error(error))
      return
    }

    // Check if we already have a valid token
    if (accessToken) {
      console.log('[Cardify] Using existing access token')
      resolve({ access_token: accessToken })
      return
    }

    // Store resolve/reject for callback
    tokenRequestResolve = resolve
    tokenRequestReject = reject

    // Request token (will show consent screen if needed)
    console.log('[Cardify] Requesting new token from Google')
    try {
      tokenClient.requestAccessToken({ prompt: 'consent' })
    } catch (error) {
      console.error('[Cardify] Failed to request token:', error)
      tokenRequestResolve = null
      tokenRequestReject = null
      reject(error)
    }

    // Timeout after 30 seconds
    const timeoutId = setTimeout(() => {
      if (tokenRequestResolve) {
        console.error('[Cardify] Token request timeout')
        tokenRequestReject(new Error('Token request timeout - no response from Google'))
        tokenRequestResolve = null
        tokenRequestReject = null
      }
    }, 30000)

    // Store timeout ID for potential cleanup
    if (tokenRequestResolve && tokenRequestReject) {
      // Wrap resolve to clear timeout
      const originalResolve = tokenRequestResolve
      tokenRequestResolve = (response) => {
        clearTimeout(timeoutId)
        originalResolve(response)
      }
      // Wrap reject to clear timeout
      const originalReject = tokenRequestReject
      tokenRequestReject = (error) => {
        clearTimeout(timeoutId)
        originalReject(error)
      }
    }
  })
}

/**
 * Fetch list of user's Sheets
 */
export async function listUserSheets() {
  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in first.')
  }

  try {
    // Build URL with proper query parameters
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: '50',
    })

    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`
    console.log('[Cardify] Fetching Sheets list from Google Drive API:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[Cardify] Drive API Error (${response.status}):`, errorBody)

      if (response.status === 401) {
        accessToken = null
        throw new Error('Authentication expired. Please sign in again.')
      }
      throw new Error(`Failed to fetch sheets: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[Cardify] Successfully fetched Sheets list:', data.files?.length || 0, 'sheets')
    return data.files || []
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      console.error('[Cardify] Network error:', error)
      throw new Error('Network error. Please check your connection.')
    }
    console.error('[Cardify] Error listing Sheets:', error.message)
    throw error
  }
}

/**
 * Get sheet metadata (names of all sheets/tabs in a spreadsheet)
 */
export async function getSheetMetadata(spreadsheetId) {
  if (!accessToken) {
    throw new Error('Not authenticated.')
  }

  try {
    // Extract and validate spreadsheet ID
    const validId = extractSpreadsheetId(spreadsheetId)
    console.log('[Cardify] Fetching sheet metadata for:', validId)

    const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + validId + '?fields=sheets(properties(sheetId,title))'

    const response = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    })

    if (!response.ok) {
      const errorBody = await response.json()
      console.error('[Cardify] Sheets API Error (' + response.status + '):', errorBody)
      throw new Error('Failed to fetch sheet metadata: ' + response.status + ' ' + response.statusText)
    }

    const data = await response.json()
    const sheets = data.sheets || []
    if (sheets.length > 0) {
      console.log('[Cardify] First sheet title:', sheets[0].properties.title)
    }
    return sheets
  } catch (error) {
    console.error('[Cardify] Error fetching sheet metadata:', error.message)
    throw error
  }
}

/**
 * Fetch data from a specific Sheet using Sheets API
 */
export async function fetchSheetData(spreadsheetId, sheetName = 'Sheet1') {
  if (!accessToken) {
    throw new Error('Not authenticated.')
  }

  try {
    // Extract and validate spreadsheet ID
    const validId = extractSpreadsheetId(spreadsheetId)
    console.log('[Cardify] Fetching sheet data for:', validId, 'sheet:', sheetName)

    // Build range: SheetName!A1:Z1000
    const range = sheetName + '!A1:Z1000';
    
    // Manually encode special characters in the range for the URL
    const encodedRange = range.replace(/!/g, '%21').replace(/:/g, '%3A');
    
    const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + validId + '/values/' + encodedRange;
    console.log('[Cardify] API URL:', url)

    const response = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('[Cardify] Sheets API error response:', errorBody);
      throw new Error('Sheets API error: ' + JSON.stringify(errorBody));
    }

    const data = await response.json();
    const values = data.values;

    if (!values || values.length === 0) {
      throw new Error('Sheet is empty or inaccessible');
    }

    // Parse headers and rows
    const headers = values[0];
    const rows = values.slice(1).map((row, index) => {
      const obj = { id: index };
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex] || '';
      });
      return obj;
    });

    console.log('[Cardify] Sheet data retrieved:', rows.length, 'rows with', headers.length, 'columns');
    return { headers, rows };
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      console.error('[Cardify] Network error:', error)
      throw new Error('Network error. Please check your connection.')
    }
    console.error('[Cardify] Error fetching sheet data:', error.message)
    throw error
  }
}

/**
 * Check if token client is initialized
 */
export function isTokenClientInitialized() {
  return tokenClientInitialized
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!accessToken
}

/**
 * Get current access token
 */
export function getAccessToken() {
  return accessToken
}

/**
 * Revoke access (sign out)
 */
export function revokeAccess() {
  const tokenToRevoke = accessToken
  accessToken = null
  tokenRequestResolve = null
  tokenRequestReject = null

  if (tokenToRevoke && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(tokenToRevoke, () => {
      console.log('[Cardify] Google access revoked')
    })
  }
}

/**
 * Store data for use across navigation
 */
let storedSpreadsheetData = {
  spreadsheetId: null,
  spreadsheetName: null,
  sheets: [],
}

export function setSpreadsheetData(data) {
  storedSpreadsheetData = { ...storedSpreadsheetData, ...data }
}

export function getSpreadsheetData() {
  return storedSpreadsheetData
}

export function clearSpreadsheetData() {
  storedSpreadsheetData = {
    spreadsheetId: null,
    spreadsheetName: null,
    sheets: [],
  }
}
