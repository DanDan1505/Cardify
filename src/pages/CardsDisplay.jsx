import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, FileText, Phone, Link, X, Share2, Copy, Check, LogOut } from 'lucide-react'
import { fetchSheetData, getSpreadsheetData } from '../utils/googleSheetsAPI'
import { getInitials, extractGoogleDriveFileId } from '../utils/googleDriveImages'
import { apiUrl } from '../config/api'

const DUMMY_DATA = [
  {
    id: 1,
    fullName: 'Sarah Anderson',
    bio: 'Product designer passionate about creating intuitive experiences that solve real problems.',
    email: 'sarah@example.com',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    linkedin: 'linkedin.com/in/sarahanderson',
  },
  {
    id: 2,
    fullName: 'Marcus Chen',
    bio: 'Full-stack developer with expertise in React and Node.js. Open source enthusiast.',
    email: 'marcus@example.com',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    linkedin: 'linkedin.com/in/marcuschen',
  },
  {
    id: 3,
    fullName: 'Emma Wilson',
    bio: 'UX researcher focused on user-centered design and accessibility. Coffee lover.',
    email: 'emma@example.com',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    linkedin: 'linkedin.com/in/emmawilson',
  },
  {
    id: 4,
    fullName: 'Alex Rivera',
    bio: 'DevOps engineer specializing in cloud infrastructure and containerization.',
    email: 'alex@example.com',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    linkedin: 'linkedin.com/in/alexrivera',
  },
  {
    id: 5,
    fullName: 'Jordan Kim',
    bio: 'Product manager obsessed with data-driven decision making and user insights.',
    email: 'jordan@example.com',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    linkedin: 'linkedin.com/in/jordankim',
  },
  {
    id: 6,
    fullName: 'Taylor Martinez',
    bio: 'Graphic designer and brand strategist. Creates visual narratives that engage.',
    email: 'taylor@example.com',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor',
    linkedin: 'linkedin.com/in/taylormartinez',
  },
]

/**
 * Columns to hide from display
 */
const HIDDEN_COLUMNS = new Set([
  'Timestamp',
  'TIMESTAMP',
  'timestamp',
])

/**
 * Column names that should be treated as specific fields
 */
const FIELD_ALIASES = {
  'FULL NAME': 'fullName',
  'Full Name': 'fullName',
  'NAME': 'fullName',
  'SHORT PROFESSIONAL BIOGRAPHY (MAX 150 WORDS)': 'bio',
  'Short Professional Biography (Max 150 Words)': 'bio',
  'Short Professional Biography': 'bio',
  'BIO': 'bio',
  'Bio': 'bio',
  'Email': 'email',
  'EMAIL': 'email',
  'PRIMARY EMAIL ADDRESS': 'email',
  'Primary Email Address': 'email',
  'Phone': 'phone',
  'PHONE': 'phone',
  'PHONE NUMBER': 'phone',
  'Phone Number': 'phone',
  'Phone/WhatsApp Number': 'phone',
  'PHONE/WHATSAPP NUMBER': 'phone',
  'WhatsApp': 'phone',
  'WHATSAPP': 'phone',
  'LinkedIn': 'linkedin',
  'LINKEDIN': 'linkedin',
  'LinkedIn URL': 'linkedin',
  'LINKEDIN URL': 'linkedin',
  'Professional or Social Link': 'linkedin',
  'PROFESSIONAL OR SOCIAL LINK': 'linkedin',
  'Social Link': 'linkedin',
  'Website': 'linkedin',
  'WEBSITE': 'linkedin',
  'UPLOAD PROFESSIONAL PROFILE PICTURE': 'image',
  'Upload Professional Profile Picture': 'image',
  'Photo URL': 'image',
  'PHOTO URL': 'image',
  'Image': 'image',
  'Profile Picture': 'image',
}

/**
 * Get field type by checking aliases with flexible matching
 */
const getFieldType = (columnName) => {
  // First try exact match
  if (FIELD_ALIASES[columnName]) {
    return FIELD_ALIASES[columnName]
  }
  
  // Flexible matching for phone fields
  const lowerCol = columnName.toLowerCase()
  if (lowerCol.includes('phone') || lowerCol.includes('whatsapp') || lowerCol.includes('mobile') || lowerCol.includes('cell')) {
    return 'phone'
  }
  
  // Flexible matching for linkedin/social fields
  if (lowerCol.includes('linkedin') || lowerCol.includes('social') || lowerCol.includes('link') || lowerCol.includes('website') || lowerCol.includes('url') && !lowerCol.includes('photo') && !lowerCol.includes('image')) {
    return 'linkedin'
  }
  
  return null
}

const getTemplateFieldType = (field, existingFields) => {
  const aliasType = getFieldType(field.name)
  if (aliasType) return aliasType

  const lowerName = field.name.toLowerCase()
  if (lowerName.includes('name') && !existingFields.fullName) return 'fullName'
  if ((lowerName.includes('bio') || lowerName.includes('description')) && !existingFields.bio) return 'bio'

  if (field.type === 'image') return 'image'
  if (field.type === 'email') return 'email'
  if (field.type === 'link') return 'linkedin'

  if (field.type === 'text') {
    return existingFields.fullName ? 'bio' : 'fullName'
  }

  return null
}

/**
 * Extract structured fields from row data
 */
const extractStructuredFields = (data, rowIndex, columnMapping, template) => {
  const fields = {
    image: null,
    fullName: null,
    bio: null,
    email: null,
    phone: null,
    linkedin: null,
  }

  console.log(`[Cardify] Row ${rowIndex} - Processing all columns:`)

  const mapping = columnMapping || template?.columnMapping || {}
  if (template?.fields?.length) {
    template.fields.forEach((field) => {
      const mappedColumn = mapping[field.id]
      if (!mappedColumn || data[mappedColumn] === undefined) return

      const value = data[mappedColumn]
      if (!value || (typeof value === 'string' && value.trim() === '')) return

      const fieldType = getTemplateFieldType(field, fields)
      if (fieldType && fields[fieldType] === null) {
        fields[fieldType] = value
      }
    })
  }
  
  Object.keys(data).forEach((columnName) => {
    const value = data[columnName]
    
    // Log all columns for debugging
    if (columnName !== 'id') {
      const fieldType = getFieldType(columnName)
      const status = columnName === 'id' ? 'SKIP_ID' : HIDDEN_COLUMNS.has(columnName) ? 'HIDDEN' : fieldType ? `MAP_TO_${fieldType.toUpperCase()}` : 'NO_MATCH'
      console.log(`  "${columnName}" = "${typeof value === 'string' ? value.substring(0, 40) : value}" [${status}]`)
    }
    
    if (columnName === 'id' || HIDDEN_COLUMNS.has(columnName)) {
      return
    }

    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return
    }

    const fieldType = getFieldType(columnName)
    if (fieldType && fields[fieldType] === null) {
      fields[fieldType] = value
    }
  })

  console.log(`[Cardify] Row ${rowIndex} - Extracted fields:`, {
    fullName: fields.fullName ? '✓' : '✗',
    bio: fields.bio ? '✓' : '✗',
    email: fields.email ? '✓' : '✗',
    phone: fields.phone ? '✓' : '✗',
    linkedin: fields.linkedin ? '✓' : '✗',
    image: fields.image ? '✓' : '✗',
  })

  return fields
}


const InitialsAvatar = ({ initials, size = 'lg' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-48 h-48 text-5xl',
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700 font-bold rounded flex items-center justify-center flex-shrink-0`}
    >
      {initials}
    </div>
  )
}

/**
 * Image component with backend proxy and initials fallback
 */
const ImageWithFallback = ({ imageUrl, personName, className = 'w-full h-full object-cover object-top', accessToken, onBlobUrlReady }) => {
  const [imageError, setImageError] = useState(false)
  const [imageSrc, setImageSrc] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!imageUrl || imageUrl.trim() === '') {
      console.log('[Cardify] ImageWithFallback: No image URL provided')
      setImageSrc(null)
      return
    }

    // Extract Google Drive file ID from URL
    const fileId = extractGoogleDriveFileId(imageUrl)
    
    if (!fileId) {
      if (/^(https?:|data:|blob:)/i.test(imageUrl)) {
        console.log('[Cardify] ImageWithFallback: Using direct image URL')
        setImageSrc(imageUrl)
        setLoading(false)

        if (onBlobUrlReady) {
          onBlobUrlReady(imageUrl)
        }
        return
      }

      console.warn('[Cardify] ImageWithFallback: Could not extract file ID from URL:', imageUrl)
      setImageSrc(null)
      return
    }

    if (!accessToken) {
      console.warn('[Cardify] ImageWithFallback: No access token available for image fetch')
      setImageSrc(null)
      return
    }

    setImageError(false)
    setLoading(true)

    // Build the backend proxy URL
    const backendUrl = apiUrl(`/api/image?fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(accessToken)}`)
    console.log('[Cardify] ImageWithFallback: Fetching image from backend URL:', backendUrl)
    
    // Test if backend is reachable first
    fetch(apiUrl('/'))
      .then(res => {
        console.log('[Cardify] ImageWithFallback: Backend test successful - status:', res.status)
        
        // Now fetch the actual image through the proxy
        return fetch(backendUrl)
      })
      .then(res => {
        console.log('[Cardify] ImageWithFallback: Image fetch response - status:', res.status, 'content-type:', res.headers.get('content-type'))
        
        if (!res.ok) {
          throw new Error(`Image fetch failed: ${res.status} ${res.statusText}`)
        }
        
        return res.blob()
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        console.log('[Cardify] ImageWithFallback: Successfully created blob URL:', blobUrl)
        setImageSrc(blobUrl)
        setLoading(false)
        
        // Pass blob URL to parent component for lightbox
        if (onBlobUrlReady) {
          onBlobUrlReady(blobUrl)
        }
      })
      .catch(err => {
        console.error('[Cardify] ImageWithFallback: Error fetching image:', err.message)
        setImageError(true)
        setLoading(false)
      })
  }, [imageUrl, accessToken, onBlobUrlReady])

  const initials = getInitials(personName)

  // Show initials fallback if no image or image failed to load
  if (!imageSrc || imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <InitialsAvatar initials={initials} size="lg" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={personName || 'profile'}
      className={className}
      onError={() => {
        console.error('[Cardify] ImageWithFallback: Image failed to load from blob URL')
        setImageError(true)
      }}
    />
  )
}

const DynamicCard = ({ data, template, columnMapping, onExport, accessToken, rowIndex = 0 }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null)
  const [exporting, setExporting] = useState(false)
  
  if (!template || !template.fields) return null

  // Extract structured fields from row data
  const fields = extractStructuredFields(data, rowIndex, columnMapping, template)
  
  console.log(`[Cardify] Card rendering - Name: ${fields.fullName}, Phone: ${fields.phone}, LinkedIn: ${fields.linkedin}`)

  const handleImageClick = () => {
    if (lightboxImageUrl) {
      setLightboxOpen(true)
    }
  }

  const handleExportCard = async () => {
    console.log('Starting export for: ' + (fields.fullName || 'Card'))
    setExporting(true)
    try {
      let imageBase64 = ''
      
      // Try to get image from the blob URL if available
      if (lightboxImageUrl) {
        try {
          console.log('[Cardify] Using lightboxImageUrl for export:', lightboxImageUrl.substring(0, 50) + '...')
          const response = await fetch(lightboxImageUrl)
          const blob = await response.blob()
          imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
          console.log('[Cardify] Converted image to base64, length:', imageBase64.length)
        } catch (error) {
          console.warn('[Cardify] Failed to convert image from lightboxImageUrl:', error)
        }
      } else {
        console.log('[Cardify] No lightboxImageUrl available, exporting without image')
      }

      // Prepare card data
      const cardData = {
        name: fields.fullName || 'Card',
        bio: fields.bio || '',
        email: fields.email || '',
        phone: fields.phone || '',
        linkedin: fields.linkedin || '',
        imageUrl: imageBase64,
      }

      console.log('[Cardify] Posting to /api/export-card with data:', {
        name: cardData.name,
        bio: cardData.bio.substring(0, 30) + '...',
        email: cardData.email,
        phone: cardData.phone,
        linkedin: cardData.linkedin,
        imageUrl: imageBase64 ? 'base64_' + imageBase64.length + '_bytes' : 'NONE',
      })

      // POST to backend API with proper headers
      const response = await fetch(apiUrl('/api/export-card'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      })

      console.log('[Cardify] Response status:', response.status, 'statusText:', response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      // Get PDF blob and trigger download
      const pdfBlob = await response.blob()
      console.log('[Cardify] Received PDF blob, size:', pdfBlob.size, 'bytes')
      
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fields.fullName || 'Card'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('[Cardify] Card exported successfully as PDF:', link.download)
    } catch (error) {
      console.error('[Cardify] Export failed:', error.message, error.stack)
      alert('Failed to export card. Error: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleBlobUrlReady = (blobUrl) => {
    console.log('[Cardify] DynamicCard: Received blob URL from ImageWithFallback:', blobUrl)
    setLightboxImageUrl(blobUrl)
  }

  return (
    <>
      <div className="border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:bg-slate-50 transition-colors bg-white">
        {/* Profile Image - Fixed 260px height with object-fit: cover and gradient overlay */}
        <div className="h-[260px] bg-slate-100 relative overflow-hidden cursor-pointer group" onClick={handleImageClick}>
          <ImageWithFallback 
            imageUrl={fields.image} 
            personName={fields.fullName || 'User'} 
            className="w-full h-full object-cover object-center" 
            accessToken={accessToken}
            onBlobUrlReady={handleBlobUrlReady}
          />
          {/* Gradient overlay at bottom fading to transparent */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"></div>
          {fields.image && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center pointer-events-none">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm font-medium">Click to expand</div>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Full Name */}
          {fields.fullName && (
            <div>
              <p className="text-base font-semibold text-slate-900">{fields.fullName}</p>
            </div>
          )}

          {/* Short Professional Biography */}
          {fields.bio && (
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Short Professional Biography</p>
              <p className="text-sm text-slate-700">{fields.bio}</p>
            </div>
          )}

          {/* Email */}
          {fields.email && (
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Email</p>
              <a
                href={`mailto:${fields.email}`}
                className="text-sm text-slate-700 hover:text-slate-900 font-medium"
              >
                {fields.email}
              </a>
            </div>
          )}

          {/* Phone/WhatsApp Number */}
          {fields.phone && (
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Phone/WhatsApp Number</p>
              <a
                href={`tel:${fields.phone.replace(/\D/g, '')}`}
                className="text-sm text-slate-700 hover:text-slate-900 font-medium flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-slate-600 flex-shrink-0" />
                {fields.phone}
              </a>
            </div>
          )}

          {/* Professional or Social Link */}
          {fields.linkedin && (
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Professional or Social Link</p>
              <a
                href={fields.linkedin.startsWith('http') ? fields.linkedin : `https://${fields.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                <Link className="w-4 h-4 text-blue-600 flex-shrink-0" />
                {fields.linkedin}
              </a>
            </div>
          )}

          <button
            onClick={handleExportCard}
            disabled={exporting}
            className="w-full mt-4 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-200 text-slate-900 text-xs font-medium rounded transition-colors flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                Export
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lightbox Modal - Uses blob URL from ImageWithFallback */}
      {lightboxOpen && lightboxImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxOpen(false)}
          tabIndex={0}
          role="dialog"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <button
              className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors z-10 bg-black bg-opacity-50 p-2 rounded-full"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" />
            </button>
            
            <img
              src={lightboxImageUrl}
              alt={fields.fullName || 'Profile'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default function CardsDisplay({ template, columnMapping, selectedSheet, accessToken, onSignOut }) {
  const navigate = useNavigate()
  const [cardData, setCardData] = useState(DUMMY_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exportingAll, setExportingAll] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  // Fetch sheet data on mount or when selectedSheet changes
  useEffect(() => {
    if (!selectedSheet?.id) {
      setCardData(DUMMY_DATA)
      return
    }

    const loadSheetData = async () => {
      setLoading(true)
      setError(null)
      try {
        const spreadsheetData = getSpreadsheetData()
        
        // Get the sheet name from stored metadata
        let sheetName = 'Sheet1'
        if (spreadsheetData.selectedSheetName) {
          sheetName = spreadsheetData.selectedSheetName
          console.log('[Cardify] CardsDisplay using selected sheet tab:', sheetName)
        } else if (spreadsheetData.sheets && spreadsheetData.sheets.length > 0 && spreadsheetData.sheets[0].properties && spreadsheetData.sheets[0].properties.title) {
          sheetName = spreadsheetData.sheets[0].properties.title
          console.log('[Cardify] CardsDisplay using sheet name:', sheetName)
        } else {
          console.warn('[Cardify] CardsDisplay: No sheet metadata found, using default: Sheet1')
        }
        
        const { rows } = await fetchSheetData(selectedSheet.id, sheetName)
        console.log('[Cardify] Fetched data - Total rows:', rows.length)
        if (rows.length > 0) {
          console.log('[Cardify] First row available columns:', Object.keys(rows[0]).filter(k => k !== 'id'))
          console.log('[Cardify] Full first row data:')
          Object.entries(rows[0]).forEach(([key, value]) => {
            if (key !== 'id') {
              console.log(`  "${key}": "${value}"`)
            }
          })
        }
        // Add IDs to rows for React keys
        const rowsWithIds = rows.map((row, index) => ({
          ...row,
          id: index,
        }))
        setCardData(rowsWithIds)
      } catch (err) {
        setError(err.message)
        setCardData(DUMMY_DATA)
      } finally {
        setLoading(false)
      }
    }

    loadSheetData()
  }, [selectedSheet])

  if (!template) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No template selected</p>
          <button
            onClick={() => navigate('/templates')}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm font-medium"
          >
            Choose a Template
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your cards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => navigate('/templates')}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="max-w-lg border border-red-200 rounded-lg bg-red-50 p-8">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error loading sheet</h2>
            <p className="text-sm text-red-700 mb-6">{error}</p>
            <button
              onClick={() => navigate('/templates')}
              className="px-4 py-2 bg-red-900 text-white rounded font-medium hover:bg-red-800 transition-colors text-sm"
            >
              Back to templates
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleExportCard = (card) => {
    // This is no longer used; export is handled in DynamicCard component
    console.log('[Cardify] Card export handled in DynamicCard component')
  }

  const handleExportAll = async () => {
    setExportingAll(true)
    try {
      // Prepare all cards data with images
      const cardsToExport = []

      // First, fetch and convert all images to base64
      for (const card of cardData) {
        const fields = extractStructuredFields(card, 0, columnMapping, template)
        
        let imageBase64 = ''
        if (fields.image) {
          try {
            // Extract Google Drive file ID from URL
            const fileId = extractGoogleDriveFileId(fields.image)
            if (fileId && accessToken) {
              const backendUrl = apiUrl(`/api/image?fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(accessToken)}`)
              const response = await fetch(backendUrl)
              if (response.ok) {
                const blob = await response.blob()
                imageBase64 = await new Promise((resolve) => {
                  const reader = new FileReader()
                  reader.onloadend = () => resolve(reader.result)
                  reader.readAsDataURL(blob)
                })
              }
            }
          } catch (error) {
            console.warn('[Cardify] Failed to convert image to base64 for card:', fields.fullName, error)
            // Continue without image
          }
        }

        cardsToExport.push({
          name: fields.fullName || 'Card',
          bio: fields.bio || '',
          email: fields.email || '',
          phone: fields.phone || '',
          linkedin: fields.linkedin || '',
          imageUrl: imageBase64,
        })
      }

      console.log('[Cardify] Exporting', cardsToExport.length, 'cards to backend')

      // POST to backend API
      const response = await fetch(apiUrl('/api/export-all'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cards: cardsToExport }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      // Get PDF blob and trigger download
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'Cardify-All-Cards.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('[Cardify] All cards exported as PDF')
    } catch (error) {
      console.error('[Cardify] Export all failed:', error)
      alert('Failed to export cards. Please try again.')
    } finally {
      setExportingAll(false)
    }
  }

  // Share cards
  const handleShare = async () => {
    setSharing(true)
    try {
      // Prepare all cards data with images
      const cardsToShare = []

      // First, fetch and convert all images to base64
      for (const card of cardData) {
        const fields = extractStructuredFields(card, 0, columnMapping, template)
        
        let imageBase64 = ''
        if (fields.image) {
          try {
            // Extract Google Drive file ID from URL
            const fileId = extractGoogleDriveFileId(fields.image)
            if (fileId && accessToken) {
              const backendUrl = apiUrl(`/api/image?fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(accessToken)}`)
              const response = await fetch(backendUrl)
              if (response.ok) {
                const blob = await response.blob()
                imageBase64 = await new Promise((resolve) => {
                  const reader = new FileReader()
                  reader.onloadend = () => resolve(reader.result)
                  reader.readAsDataURL(blob)
                })
              }
            }
          } catch (error) {
            console.warn('[Cardify] Failed to convert image to base64 for card:', fields.fullName, error)
            // Continue without image
          }
        }

        cardsToShare.push({
          name: fields.fullName || 'Card',
          bio: fields.bio || '',
          email: fields.email || '',
          phone: fields.phone || '',
          linkedin: fields.linkedin || '',
          imageUrl: imageBase64,
        })
      }

      console.log('[Cardify] Creating share link for', cardsToShare.length, 'cards')

      // POST to backend API
      const response = await fetch(apiUrl('/api/share'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cards: cardsToShare }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const shareUrl = window.location.origin + '/share/' + data.shareId
      setShareUrl(shareUrl)
      setShowShareModal(true)

      console.log('[Cardify] Share link created:', shareUrl)
    } catch (error) {
      console.error('[Cardify] Share failed:', error)
      alert('Failed to create share link. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  // Copy share URL to clipboard
  const handleCopyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSignOut = () => {
    onSignOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/templates')}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Cards</h1>
              <p className="text-slate-600 mt-1 text-sm">
                {cardData.length} items · <span className="font-medium">{template.name}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-900 font-medium rounded hover:bg-slate-300 disabled:bg-slate-300 transition-colors text-sm"
            >
              {sharing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share
                </>
              )}
            </button>

            <button
              onClick={handleExportAll}
              disabled={exportingAll}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 disabled:bg-slate-600 transition-colors text-sm"
            >
              {exportingAll ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Export All
                </>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-slate-100 rounded transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardData.map((card, index) => (
            <div key={card.id} data-card>
              <DynamicCard
                data={card}
                template={template}
                columnMapping={columnMapping}
                onExport={handleExportCard}
                accessToken={accessToken}
                rowIndex={index}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Share Cards</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Share URL */}
            <p className="text-sm text-slate-600 mb-4">
              Share this link with others to let them view your cards:
            </p>

            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={shareUrl || ''}
                readOnly
                className="flex-1 px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono text-slate-700 focus:outline-none"
              />
              <button
                onClick={handleCopyShareUrl}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 transition-colors text-sm"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Footer */}
            <p className="text-xs text-slate-500 mb-4">
              Anyone with this link can view and export these cards. No Google sign-in required.
            </p>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-2 bg-slate-100 text-slate-900 font-medium rounded hover:bg-slate-200 transition-colors text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
