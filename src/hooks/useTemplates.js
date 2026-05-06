import { useState, useEffect } from 'react'

const FIELD_TYPES = [
  { id: 'text', label: 'Text', description: 'Short text field' },
  { id: 'image', label: 'Image', description: 'Image URL field' },
  { id: 'email', label: 'Email', description: 'Email address' },
  { id: 'link', label: 'Link', description: 'URL/Link field' },
  { id: 'number', label: 'Number', description: 'Numeric value' },
]

export function useTemplates() {
  const [templates, setTemplates] = useState([])
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('cardify_custom_templates')
    if (stored) {
      try {
        setTemplates(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse stored templates', e)
      }
    }
    setLoaded(true)
  }, [])

  // Save to localStorage whenever templates change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('cardify_custom_templates', JSON.stringify(templates))
    }
  }, [templates, loaded])

  const saveTemplate = (template) => {
    const newTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      isCustom: true,
    }
    setTemplates([...templates, newTemplate])
    return newTemplate
  }

  const deleteTemplate = (id) => {
    setTemplates(templates.filter((t) => t.id !== id))
  }

  const getAllTemplates = (defaultTemplates) => {
    return [...defaultTemplates, ...templates]
  }

  return {
    customTemplates: templates,
    saveTemplate,
    deleteTemplate,
    getAllTemplates,
  }
}

export { FIELD_TYPES }
