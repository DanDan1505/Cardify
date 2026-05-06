import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Download, AlertCircle, X } from 'lucide-react'

const getInitials = (name = '') => {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

const getSafeFileName = (name = 'Profile Image') => {
  const safeName = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')

  return safeName || 'Profile Image'
}

const convertImageBlobToJpeg = (blob) => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(blob)

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight

      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0)

      canvas.toBlob(
        (jpegBlob) => {
          URL.revokeObjectURL(objectUrl)
          if (jpegBlob) {
            resolve(jpegBlob)
          } else {
            reject(new Error('Unable to convert image to JPG'))
          }
        },
        'image/jpeg',
        0.92
      )
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to load image for download'))
    }

    image.src = objectUrl
  })
}

const SharedCards = () => {
  const { id } = useParams()
  const [cardData, setCardData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportingAll, setExportingAll] = useState(false)
  const [lightboxCard, setLightboxCard] = useState(null)
  const [downloadingImage, setDownloadingImage] = useState(false)

  // Fetch shared cards
  useEffect(() => {
    const fetchSharedCards = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`http://localhost:3001/api/share/${id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Share link not found or has expired')
          }
          throw new Error(`Failed to load shared cards: ${response.statusText}`)
        }
        
        const data = await response.json()
        setCardData(data.cards || [])
      } catch (err) {
        console.error('[Cardify] Error fetching shared cards:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchSharedCards()
    }
  }, [id])

  useEffect(() => {
    if (!lightboxCard) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLightboxCard(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [lightboxCard])

  // Export single card as PDF
  const handleExportCard = async (card) => {
    setExporting(card.name)
    try {
      const response = await fetch('http://localhost:3001/api/export-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: card.name || 'Card',
          bio: card.bio || '',
          email: card.email || '',
          phone: card.phone || '',
          linkedin: card.linkedin || '',
          imageUrl: card.imageUrl || '',
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${card.name}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('[Cardify] Card exported as PDF:', card.name)
    } catch (error) {
      console.error('[Cardify] Export failed:', error)
      alert('Failed to export card. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  // Export all cards as PDF
  const handleExportAll = async () => {
    setExportingAll(true)
    try {
      const response = await fetch('http://localhost:3001/api/export-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cards: cardData }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

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

  const handleDownloadProfileImage = async (card) => {
    if (!card?.imageUrl) return

    setDownloadingImage(true)
    try {
      const response = await fetch(card.imageUrl)

      if (!response.ok) {
        throw new Error(`Image download failed: ${response.status} ${response.statusText}`)
      }

      const imageBlob = await response.blob()
      const jpegBlob = await convertImageBlobToJpeg(imageBlob)
      const url = URL.createObjectURL(jpegBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${getSafeFileName(card.name)}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[Cardify] Profile image download failed:', error)
      alert('Failed to download profile image. Please try again.')
    } finally {
      setDownloadingImage(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading shared cards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Unable to Load Cards</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (cardData.length === 0) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No cards to display</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Shared Cards</h1>
            <p className="text-slate-600 mt-1 text-sm">
              {cardData.length} {cardData.length === 1 ? 'card' : 'cards'}
            </p>
          </div>

          {cardData.length > 1 && (
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
                  <Download className="w-4 h-4" />
                  Export All
                </>
              )}
            </button>
          )}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardData.map((card, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Profile Image */}
              <div
                className={`w-full h-48 bg-slate-100 overflow-hidden ${card.imageUrl ? 'cursor-pointer group relative' : ''}`}
                onClick={() => card.imageUrl && setLightboxCard(card)}
              >
                {card.imageUrl ? (
                  <>
                    <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover object-center" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center pointer-events-none">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm font-medium">Click to expand</div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 text-3xl font-bold">
                    {getInitials(card.name)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Name */}
                {card.name && (
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 break-words">{card.name}</h3>
                )}

                {/* Bio */}
                {card.bio && (
                  <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap break-words">{card.bio}</p>
                )}

                {/* Contact Details */}
                <div className="space-y-2 mb-4 text-sm text-slate-700">
                  {card.email && (
                    <div className="break-words">
                      <span className="font-medium text-slate-600">Email: </span>
                      <a href={`mailto:${card.email}`} className="text-blue-600 hover:underline">
                        {card.email}
                      </a>
                    </div>
                  )}
                  {card.phone && (
                    <div className="break-words">
                      <span className="font-medium text-slate-600">Phone: </span>
                      {card.phone}
                    </div>
                  )}
                  {card.linkedin && (
                    <div className="break-words">
                      <span className="font-medium text-slate-600">LinkedIn: </span>
                      <a
                        href={card.linkedin.startsWith('http') ? card.linkedin : `https://${card.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-words"
                      >
                        {card.linkedin}
                      </a>
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <button
                  onClick={() => handleExportCard(card)}
                  disabled={exporting === card.name}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 font-medium rounded hover:bg-slate-200 disabled:bg-slate-200 transition-colors text-sm"
                >
                  {exporting === card.name ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Card
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Image Lightbox */}
      {lightboxCard?.imageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
          onClick={() => setLightboxCard(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                className="text-white hover:text-slate-300 transition-colors bg-black bg-opacity-50 p-2 rounded-full disabled:opacity-60"
                onClick={(event) => {
                  event.stopPropagation()
                  handleDownloadProfileImage(lightboxCard)
                }}
                disabled={downloadingImage}
                aria-label="Download profile image"
              >
                <Download className="w-6 h-6" />
              </button>
              <button
                className="text-white hover:text-slate-300 transition-colors bg-black bg-opacity-50 p-2 rounded-full"
                onClick={(event) => {
                  event.stopPropagation()
                  setLightboxCard(null)
                }}
                aria-label="Close lightbox"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <img
              src={lightboxCard.imageUrl}
              alt={lightboxCard.name || 'Profile'}
              className="max-w-full max-h-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default SharedCards
