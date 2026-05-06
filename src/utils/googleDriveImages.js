/**
 * Extract FILE_ID from Google Drive URLs
 * Handles formats like:
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/uc?id=FILE_ID
 */
export function extractGoogleDriveFileId(url) {
  if (!url || typeof url !== 'string') {
    return null
  }

  // Handle various Google Drive URL formats
  let fileId = null

  // Format: https://drive.google.com/open?id=FILE_ID or ?id=FILE_ID in any Drive URL
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/)
  if (idMatch && idMatch[1]) {
    fileId = idMatch[1]
  }

  // Format: https://drive.google.com/file/d/FILE_ID/view or /d/FILE_ID/
  const dMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (!fileId && dMatch && dMatch[1]) {
    fileId = dMatch[1]
  }

  // Format: just a FILE_ID (fallback - assume it's a direct ID)
  if (!fileId && url.match(/^[a-zA-Z0-9-_]+$/)) {
    fileId = url
  }

  return fileId
}

/**
 * Generate initials from a name string
 * e.g., "Sarah Anderson" -> "SA"
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') {
    return '?'
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2)
}
