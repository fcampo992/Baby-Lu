'use client'

import { useEffect, useState } from 'react'

export default function AdminSettingsPage() {
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          const phoneSetting = (data.settings as { key: string; value: string }[]).find(
            (s) => s.key === 'whatsapp_phone'
          )
          const phone = phoneSetting?.value ?? ''
          setWhatsappPhone(phone)
          setInputValue(phone)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmed = inputValue.trim()
    if (!trimmed) {
      setError('El número de WhatsApp es requerido')
      return
    }
    if (!/^\d+$/.test(trimmed)) {
      setError('Solo se permiten dígitos (sin +, espacios ni guiones). Ej: 5491112345678')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'whatsapp_phone', value: trimmed }),
      })
      if (res.ok) {
        setWhatsappPhone(trimmed)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data?.fields?.value || 'Error al guardar')
      }
    } catch {
      setError('Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Ajustes generales de la tienda</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Número de WhatsApp
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Este número recibirá las notificaciones de nuevos pedidos y cancelaciones.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
                Número actual:{' '}
                <span className="font-normal text-gray-500">{whatsappPhone || 'No configurado'}</span>
              </label>
              <input
                id="whatsapp"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="5491112345678"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Formato: código de país + código de área + número, sin +, espacios ni guiones.
                Ejemplo para Argentina: <code className="bg-gray-100 px-1 rounded">5491112345678</code>
              </p>
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
                ✅ Número guardado correctamente
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
