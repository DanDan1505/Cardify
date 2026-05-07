import { HashRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Landing from './pages/Landing'
import TemplateSelection from './pages/TemplateSelection'
import TemplateBuilder from './pages/TemplateBuilder'
import CardsDisplay from './pages/CardsDisplay'
import SharedCards from './pages/SharedCards'
import { useTemplates } from './hooks/useTemplates'
import { initializeGoogle, isAuthenticated as checkAuth, getAccessToken, revokeAccess, clearSpreadsheetData } from './utils/googleSheetsAPI'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth())
  const [selectedSheet, setSelectedSheet] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [columnMapping, setColumnMapping] = useState(null)
  const { customTemplates, saveTemplate } = useTemplates()

  // Initialize Google Sign-In on mount
  useEffect(() => {
    console.log('[Cardify] Initializing Google Sign-In...')
    initializeGoogle()
      .then(() => {
        console.log('[Cardify] Google Sign-In initialized successfully')
      })
      .catch((err) => {
        console.error('[Cardify] Failed to initialize Google Sign-In:', err)
      })
  }, [])

  const DEFAULT_TEMPLATES = [
    {
      id: 'profile',
      name: 'Profile Card',
      description: 'Perfect for people profiles or team bios',
      isCustom: false,
      fields: [
        { id: 'field-1', name: 'Full Name', type: 'text' },
        { id: 'field-2', name: 'Bio', type: 'text' },
        { id: 'field-3', name: 'Email', type: 'email' },
        { id: 'field-4', name: 'Photo URL', type: 'image' },
        { id: 'field-5', name: 'LinkedIn', type: 'link' },
      ],
    },
    {
      id: 'product',
      name: 'Product Card',
      description: 'Ideal for product catalogs and listings',
      isCustom: false,
      fields: [
        { id: 'field-1', name: 'Product Name', type: 'text' },
        { id: 'field-2', name: 'Price', type: 'number' },
        { id: 'field-3', name: 'Description', type: 'text' },
        { id: 'field-4', name: 'Product Image', type: 'image' },
      ],
    },
    {
      id: 'event',
      name: 'Event Card',
      description: 'Great for events, conferences, and meetups',
      isCustom: false,
      fields: [
        { id: 'field-1', name: 'Event Name', type: 'text' },
        { id: 'field-2', name: 'Date & Time', type: 'text' },
        { id: 'field-3', name: 'Description', type: 'text' },
        { id: 'field-4', name: 'Event Link', type: 'link' },
      ],
    },
  ]

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates]

  const handleSignOut = () => {
    revokeAccess()
    clearSpreadsheetData()
    setIsAuthenticated(false)
    setSelectedSheet(null)
    setSelectedTemplate(null)
    setColumnMapping(null)
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Landing
              isAuthenticated={isAuthenticated}
              setIsAuthenticated={setIsAuthenticated}
              setSelectedSheet={setSelectedSheet}
              onSignOut={handleSignOut}
            />
          }
        />
        <Route
          path="/templates"
          element={
            <TemplateSelection
              templates={allTemplates}
              selectedSheet={selectedSheet}
              setSelectedTemplate={setSelectedTemplate}
              setColumnMapping={setColumnMapping}
              onSignOut={handleSignOut}
            />
          }
        />
        <Route
          path="/template-builder"
          element={
            <TemplateBuilder
              onSave={saveTemplate}
              onSignOut={handleSignOut}
            />
          }
        />
        <Route
          path="/cards"
          element={
            <CardsDisplay
              template={selectedTemplate}
              columnMapping={columnMapping}
              selectedSheet={selectedSheet}
              accessToken={getAccessToken()}
              onSignOut={handleSignOut}
            />
          }
        />
        <Route
          path="/share/:id"
          element={<SharedCards />}
        />
      </Routes>
    </HashRouter>
  )
}

export default App
