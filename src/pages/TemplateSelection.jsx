import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, ArrowRight, LogOut } from 'lucide-react'
import { fetchSheetData, getSheetMetadata, setSpreadsheetData } from '../utils/googleSheetsAPI'

const DUMMY_COLUMNS = ['Full Name', 'Bio', 'Email', 'Photo URL', 'LinkedIn']

const findDefaultColumnForField = (field, availableColumns) => {
  const fieldName = field.name.toLowerCase()
  const columns = availableColumns || []
  const findColumn = (predicate) => columns.find((col) => predicate(col.toLowerCase()))

  const directMatch = findColumn((col) => col.includes(fieldName) || fieldName.includes(col))
  if (directMatch) return directMatch

  if (field.type === 'image') {
    const imageMatch = findColumn((col) =>
      col.includes('photo') ||
      col.includes('image') ||
      col.includes('picture') ||
      col.includes('upload')
    )
    if (imageMatch) return imageMatch
  }

  if (field.type === 'email') {
    const emailMatch = findColumn((col) => col.includes('email'))
    if (emailMatch) return emailMatch
  }

  if (field.type === 'link') {
    const linkMatch = findColumn((col) =>
      (col.includes('linkedin') ||
        col.includes('social') ||
        col.includes('website') ||
        col.includes('link') ||
        col.includes('url')) &&
      !col.includes('photo') &&
      !col.includes('image') &&
      !col.includes('picture')
    )
    if (linkMatch) return linkMatch
  }

  if (fieldName.includes('phone') || fieldName.includes('whatsapp')) {
    const phoneMatch = findColumn((col) =>
      col.includes('phone') ||
      col.includes('whatsapp') ||
      col.includes('mobile') ||
      col.includes('cell')
    )
    if (phoneMatch) return phoneMatch
  }

  if (fieldName.includes('name')) {
    const nameMatch = findColumn((col) => col.includes('name'))
    if (nameMatch) return nameMatch
  }

  if (fieldName.includes('bio') || fieldName.includes('description')) {
    const bioMatch = findColumn((col) =>
      col.includes('bio') ||
      col.includes('biography') ||
      col.includes('description')
    )
    if (bioMatch) return bioMatch
  }

  return columns[0] || ''
}

export default function TemplateSelection({ templates, selectedSheet, setSelectedTemplate, setColumnMapping, onSignOut }) {
  const [selected, setSelected] = useState(null)
  const [mapping, setMapping] = useState({})
  const [columns, setColumns] = useState(DUMMY_COLUMNS)
  const [sheets, setSheets] = useState([])
  const [selectedSheetName, setSelectedSheetName] = useState('Sheet1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Fetch sheet metadata and data when component mounts
  useEffect(() => {
    if (!selectedSheet?.id) {
      navigate('/')
      return
    }

    const loadSheetData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch sheet names/tabs
        const sheetsData = await getSheetMetadata(selectedSheet.id)
        setSheets(sheetsData)
        
        // Store sheets metadata for CardsDisplay to use
        setSpreadsheetData({
          spreadsheetId: selectedSheet.id,
          sheets: sheetsData,
        })
        console.log('[Cardify] Stored sheets metadata:', sheetsData.length, 'sheets')
        
        if (sheetsData.length > 0) {
          const firstSheetName = sheetsData[0].properties.title
          setSelectedSheetName(firstSheetName)
          setSpreadsheetData({ selectedSheetName: firstSheetName })
          
          // Fetch data from first sheet
          const { headers } = await fetchSheetData(selectedSheet.id, firstSheetName)
          setColumns(headers.length > 0 ? headers : DUMMY_COLUMNS)
        }
      } catch (err) {
        setError(err.message)
        setColumns(DUMMY_COLUMNS)
      } finally {
        setLoading(false)
      }
    }

    loadSheetData()
  }, [selectedSheet, navigate])

  const handleSheetChange = async (sheetName) => {
    setSelectedSheetName(sheetName)
    setSpreadsheetData({ selectedSheetName: sheetName })
    setLoading(true)
    setError(null)
    try {
      const { headers } = await fetchSheetData(selectedSheet.id, sheetName)
      const nextColumns = headers.length > 0 ? headers : DUMMY_COLUMNS
      setColumns(nextColumns)

      if (selectedTemplateObj) {
        initializeMapping(selectedTemplateObj, nextColumns)
      }
    } catch (err) {
      setError(err.message)
      setColumns(DUMMY_COLUMNS)
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplateObj = templates.find((t) => t.id === selected)

  const initializeMapping = (template, availableColumns = columns) => {
    const newMapping = {}
    template.fields.forEach((field) => {
      newMapping[field.id] = findDefaultColumnForField(field, availableColumns)
    })
    setMapping(newMapping)
  }

  const handleSelectTemplate = (templateId) => {
    setSelected(templateId)
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      initializeMapping(template)
    }
  }

  const handleGenerate = () => {
    if (selected && selectedTemplateObj) {
      setSelectedTemplate({
        ...selectedTemplateObj,
        columnMapping: mapping,
      })
      setColumnMapping(mapping)
      navigate('/cards')
    }
  }

  const handleSignOut = () => {
    onSignOut()
    navigate('/')
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading sheet data...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12 flex items-center justify-center">
        <div className="max-w-lg">
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="text-center border border-red-200 rounded-lg bg-red-50 p-8">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Unable to load sheet</h2>
            <p className="text-sm text-red-700 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-red-900 text-white rounded font-medium hover:bg-red-800 transition-colors text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your sheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Choose Template</h1>
              <p className="text-slate-600 mt-1 text-sm">
                {selectedSheet?.name} · {sheets.length} sheet{sheets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/template-builder')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium rounded transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Create
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

        {/* Sheet Selector */}
        {sheets.length > 1 && (
          <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded">
            <label className="block text-sm font-medium text-slate-900 mb-2">Select Sheet</label>
            <select
              value={selectedSheetName}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-colors"
            >
              {sheets.map((sheet) => (
                <option key={sheet.properties.sheetId} value={sheet.properties.title}>
                  {sheet.properties.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template.id)}
              className={`text-left p-6 rounded border transition-all ${
                selected === template.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <h3 className="text-base font-semibold text-slate-900 mb-1">{template.name}</h3>
              <p className="text-sm text-slate-600 mb-3">{template.description}</p>
              {template.isCustom && (
                <span className="inline-block text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded">Custom</span>
              )}
            </button>
          ))}
        </div>

        {/* Column Mapping */}
        {selected && selectedTemplateObj && (
          <div className="border border-slate-200 rounded p-8 mb-8 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Map Columns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedTemplateObj.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-medium text-slate-900">
                    {field.name}
                    <span className="text-xs text-slate-500 font-normal ml-2">· {field.type}</span>
                  </label>
                  <select
                    value={mapping[field.id] || ''}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        [field.id]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-colors"
                  >
                    <option value="">Select a column</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!selected}
          className={`w-full py-3 rounded font-medium transition-all flex items-center justify-center gap-2 text-sm ${
            selected
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Generate Cards
          {selected && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
