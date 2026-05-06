import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, LogOut } from 'lucide-react'
import { FIELD_TYPES } from '../hooks/useTemplates'

export default function TemplateBuilder({ onSave, onSignOut }) {
  const [templateName, setTemplateName] = useState('')
  const [fields, setFields] = useState([])
  const [selectedType, setSelectedType] = useState('text')
  const [fieldName, setFieldName] = useState('')
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()

  const addField = () => {
    if (!fieldName.trim()) {
      setErrors({ ...errors, fieldName: 'Field name is required' })
      return
    }

    const newField = {
      id: `field-${Date.now()}`,
      name: fieldName,
      type: selectedType,
    }

    setFields([...fields, newField])
    setFieldName('')
    setErrors({})
  }

  const removeField = (id) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  const moveField = (index, direction) => {
    const newFields = [...fields]
    if (direction === 'up' && index > 0) {
      ;[newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]]
    } else if (direction === 'down' && index < newFields.length - 1) {
      ;[newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]]
    }
    setFields(newFields)
  }

  const handleSave = () => {
    const newErrors = {}

    if (!templateName.trim()) {
      newErrors.templateName = 'Template name is required'
    }

    if (fields.length === 0) {
      newErrors.fields = 'Add at least one field'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      name: templateName,
      fields: fields,
    })

    navigate('/templates')
  }

  const handleSignOut = () => {
    onSignOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/templates')}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Create Template</h1>
              <p className="text-slate-600 mt-1 text-sm">Build a custom template for your data</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Template Name */}
        <div className="border border-slate-200 rounded p-6 mb-8 bg-slate-50">
          <div className="space-y-2 mb-6">
            <label htmlFor="template-name" className="block text-sm font-medium text-slate-900">
              Template Name
            </label>
            <input
              id="template-name"
              type="text"
              placeholder="e.g., Customer Profile, Job Listing"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value)
                if (errors.templateName) {
                  setErrors({ ...errors, templateName: '' })
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-colors"
            />
            {errors.templateName && (
              <p className="text-sm text-red-600">{errors.templateName}</p>
            )}
          </div>

          {/* Add Field Section */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Add Fields</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="field-name" className="block text-xs font-medium text-slate-700">
                  Field Name
                </label>
                <input
                  id="field-name"
                  type="text"
                  placeholder="e.g., Full Name"
                  value={fieldName}
                  onChange={(e) => {
                    setFieldName(e.target.value)
                    if (errors.fieldName) {
                      setErrors({ ...errors, fieldName: '' })
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addField()}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-colors"
                />
                {errors.fieldName && (
                  <p className="text-xs text-red-600">{errors.fieldName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="field-type" className="block text-xs font-medium text-slate-700">
                  Type
                </label>
                <select
                  id="field-type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-colors"
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={addField}
                  className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fields List */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Fields ({fields.length})
            </h2>
            {errors.fields && <p className="text-sm text-red-600">{errors.fields}</p>}
          </div>

          {fields.length === 0 ? (
            <div className="border border-slate-200 rounded p-12 text-center bg-slate-50">
              <p className="text-slate-600 text-sm">No fields added yet</p>
              <p className="text-xs text-slate-500 mt-1">Add fields above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => {
                const fieldType = FIELD_TYPES.find((t) => t.id === field.type)
                return (
                  <div
                    key={field.id}
                    className="border border-slate-200 rounded p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-medium min-w-max">{index + 1}.</span>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{field.name}</p>
                        <p className="text-xs text-slate-500">{fieldType?.label}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Reorder Buttons */}
                      <button
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 hover:bg-slate-100 disabled:text-slate-300 text-slate-500 rounded transition-colors"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveField(index, 'down')}
                        disabled={index === fields.length - 1}
                        className="p-1.5 hover:bg-slate-100 disabled:text-slate-300 text-slate-500 rounded transition-colors"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 hover:text-red-700 rounded transition-colors"
                        title="Delete field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Preview */}
        {fields.length > 0 && (
          <div className="border border-slate-200 rounded p-6 mb-8 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Preview</h3>
            <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
              {fields.map((field) => {
                const fieldType = FIELD_TYPES.find((t) => t.id === field.type)
                return (
                  <div key={field.id} className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{field.name}</p>
                    <div className="bg-slate-100 rounded h-6 w-32"></div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium rounded transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded transition-colors text-sm"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  )
}
