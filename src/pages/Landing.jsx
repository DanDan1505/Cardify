import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight } from 'lucide-react'
import { requestAccessToken, listUserSheets, setSpreadsheetData, isTokenClientInitialized } from '../utils/googleSheetsAPI'

export default function Landing({ isAuthenticated, setIsAuthenticated, setSelectedSheet, onSignOut }) {
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedSheetId, setSelectedSheetId] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const navigate = useNavigate()

  // Check for initialization and load sheets when authenticated
  useEffect(() => {
    // Check if token client is initialized
    const checkInitialized = setInterval(() => {
      if (isTokenClientInitialized()) {
        console.log('[Cardify] Token client initialized, enabling sign-in')
        setInitialized(true)
        clearInterval(checkInitialized)
      }
    }, 100)

    // Clear interval after 10 seconds if not initialized
    const timeoutId = setTimeout(() => {
      clearInterval(checkInitialized)
      if (!isTokenClientInitialized()) {
        console.warn('[Cardify] Token client initialization timeout')
        setError('Failed to initialize Google Sign-In. Please refresh the page.')
      }
    }, 10000)

    return () => {
      clearInterval(checkInitialized)
      clearTimeout(timeoutId)
    }
  }, [])

  // Load sheets when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadUserSheets()
    }
  }, [isAuthenticated])

  const loadUserSheets = async () => {
    setLoading(true)
    setError(null)
    try {
      const userSheets = await listUserSheets()
      setSheets(userSheets)
      if (userSheets.length === 0) {
        setError('No Sheets found in your Google Drive')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await requestAccessToken()
      setIsAuthenticated(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    onSignOut()
    setSheets([])
    setSelectedSheetId(null)
    setError(null)
  }

  const handleSelectSheet = (sheet) => {
    setSelectedSheetId(sheet.id)
    setSpreadsheetData({
      spreadsheetId: sheet.id,
      spreadsheetName: sheet.name,
    })
    setSelectedSheet({
      id: sheet.id,
      name: sheet.name,
      modifiedTime: sheet.modifiedTime,
    })
  }

  const handleContinue = () => {
    if (selectedSheetId) {
      navigate('/templates')
    }
  }

  // Not authenticated - show sign in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Heading */}
          <div className="mb-16 space-y-3">
            <h1 className="text-5xl font-semibold text-slate-900">Cardify</h1>
            <p className="text-lg text-slate-600 font-normal">
              Turn your Google Sheets into beautiful cards
            </p>
          </div>

          {/* Sign In Section */}
          <div className="space-y-6">
            <button
              onClick={handleSignIn}
              disabled={loading || !initialized}
              className={`w-full px-4 py-3 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                loading || !initialized
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {!initialized ? 'Loading...' : loading ? 'Signing in...' : 'Sign in with Google'}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mt-16 pt-12 border-t border-slate-200 space-y-6">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 1</div>
              <p className="text-sm text-slate-700">Sign in with your Google account</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 2</div>
              <p className="text-sm text-slate-700">Select a Sheet from your Google Drive</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 3</div>
              <p className="text-sm text-slate-700">Choose a template and generate cards</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated - show sheet selection
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Select a Sheet</h1>
            <p className="text-slate-600 mt-1 text-sm">Choose a Sheet from your Google Drive</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Sheets List */}
        <div className="space-y-3 mb-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading your Sheets...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          ) : sheets.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 text-center">
              No Sheets found. Create one in Google Drive and refresh.
            </div>
          ) : (
            sheets.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => handleSelectSheet(sheet)}
                className={`w-full text-left p-4 rounded border transition-all ${
                  selectedSheetId === sheet.id
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{sheet.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(sheet.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedSheetId === sheet.id && (
                    <ChevronRight className="w-5 h-5 text-slate-900 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedSheetId || loading}
          className={`w-full py-3 rounded font-medium transition-all ${
            selectedSheetId && !loading
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>

        {/* Refresh button */}
        {!loading && sheets.length > 0 && (
          <button
            onClick={loadUserSheets}
            className="mt-4 w-full py-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
          >
            Refresh Sheets
          </button>
        )}
      </div>
    </div>
  )
}
