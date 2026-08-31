'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrandingState {
  store_name: string
  store_logo_url: string
  store_favicon_url: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function saveSetting(key: string, value: string): Promise<boolean> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
  return res.ok
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(
      data.error === 'INVALID_FILE_TYPE'
        ? 'Solo se permiten imágenes JPEG, PNG o WebP'
        : 'Error al subir el archivo'
    )
  }
  const data = await res.json()
  return data.url as string
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  )
}

// ─── Status feedback ──────────────────────────────────────────────────────────

function StatusMessage({
  type,
  message,
}: {
  type: 'success' | 'error'
  message: string
}) {
  if (!message) return null
  return (
    <div
      className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg mt-3 ${
        type === 'success'
          ? 'bg-green-50 border border-green-200 text-green-700'
          : 'bg-red-50 border border-red-200 text-red-700'
      }`}
    >
      <span>{type === 'success' ? '✅' : '⚠️'}</span>
      {message}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandingPage() {
  const [branding, setBranding] = useState<BrandingState>({
    store_name: '',
    store_logo_url: '',
    store_favicon_url: '',
  })
  const [loading, setLoading] = useState(true)

  // Per-section state
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [nameInput, setNameInput] = useState('')

  const [logoSaving, setLogoSaving] = useState(false)
  const [logoMsg, setLogoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  const [faviconSaving, setFaviconSaving] = useState(false)
  const [faviconMsg, setFaviconMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  // ─── Load current settings ─────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const data = await res.json()
        const map = Object.fromEntries(
          (data.settings as { key: string; value: string }[]).map((s) => [s.key, s.value])
        )
        const loaded: BrandingState = {
          store_name: map.store_name ?? '',
          store_logo_url: map.store_logo_url ?? '',
          store_favicon_url: map.store_favicon_url ?? '',
        }
        setBranding(loaded)
        setNameInput(loaded.store_name)
        if (loaded.store_logo_url) setLogoPreview(loaded.store_logo_url)
        if (loaded.store_favicon_url) setFaviconPreview(loaded.store_favicon_url)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ─── Store name ────────────────────────────────────────────────────────────

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameMsg(null)
    const val = nameInput.trim()
    if (!val) {
      setNameMsg({ type: 'error', text: 'El nombre no puede estar vacío' })
      return
    }
    setNameSaving(true)
    try {
      const ok = await saveSetting('store_name', val)
      if (ok) {
        setBranding((p) => ({ ...p, store_name: val }))
        setNameMsg({ type: 'success', text: 'Nombre guardado. Recargá la página para verlo actualizado.' })
      } else {
        setNameMsg({ type: 'error', text: 'Error al guardar el nombre' })
      }
    } catch {
      setNameMsg({ type: 'error', text: 'Error de red al guardar' })
    } finally {
      setNameSaving(false)
    }
  }

  // ─── Logo ──────────────────────────────────────────────────────────────────

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    setLogoMsg(null)
  }

  async function handleSaveLogo(e: React.FormEvent) {
    e.preventDefault()
    setLogoMsg(null)
    const file = logoRef.current?.files?.[0]
    if (!file && !branding.store_logo_url) {
      setLogoMsg({ type: 'error', text: 'Seleccioná una imagen primero' })
      return
    }

    setLogoSaving(true)
    try {
      let url = branding.store_logo_url
      if (file) {
        url = await uploadFile(file)
      }
      const ok = await saveSetting('store_logo_url', url)
      if (ok) {
        setBranding((p) => ({ ...p, store_logo_url: url }))
        setLogoPreview(url)
        if (logoRef.current) logoRef.current.value = ''
        setLogoMsg({ type: 'success', text: 'Logo guardado correctamente. Recargá para verlo en el sitio.' })
      } else {
        setLogoMsg({ type: 'error', text: 'Error al guardar el logo' })
      }
    } catch (err) {
      setLogoMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error inesperado' })
    } finally {
      setLogoSaving(false)
    }
  }

  async function handleRemoveLogo() {
    setLogoSaving(true)
    try {
      await saveSetting('store_logo_url', '')
      setBranding((p) => ({ ...p, store_logo_url: '' }))
      setLogoPreview(null)
      if (logoRef.current) logoRef.current.value = ''
      setLogoMsg({ type: 'success', text: 'Logo eliminado. Se mostrará el nombre de texto.' })
    } catch {
      setLogoMsg({ type: 'error', text: 'Error al eliminar el logo' })
    } finally {
      setLogoSaving(false)
    }
  }

  // ─── Favicon ───────────────────────────────────────────────────────────────

  function handleFaviconFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFaviconPreview(URL.createObjectURL(file))
    setFaviconMsg(null)
  }

  async function handleSaveFavicon(e: React.FormEvent) {
    e.preventDefault()
    setFaviconMsg(null)
    const file = faviconRef.current?.files?.[0]
    if (!file && !branding.store_favicon_url) {
      setFaviconMsg({ type: 'error', text: 'Seleccioná una imagen primero' })
      return
    }

    setFaviconSaving(true)
    try {
      let url = branding.store_favicon_url
      if (file) {
        url = await uploadFile(file)
      }
      const ok = await saveSetting('store_favicon_url', url)
      if (ok) {
        setBranding((p) => ({ ...p, store_favicon_url: url }))
        setFaviconPreview(url)
        if (faviconRef.current) faviconRef.current.value = ''
        setFaviconMsg({ type: 'success', text: 'Favicon guardado. Recargá el sitio para verlo en la pestaña.' })
      } else {
        setFaviconMsg({ type: 'error', text: 'Error al guardar el favicon' })
      }
    } catch (err) {
      setFaviconMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error inesperado' })
    } finally {
      setFaviconSaving(false)
    }
  }

  async function handleRemoveFavicon() {
    setFaviconSaving(true)
    try {
      await saveSetting('store_favicon_url', '')
      setBranding((p) => ({ ...p, store_favicon_url: '' }))
      setFaviconPreview(null)
      if (faviconRef.current) faviconRef.current.value = ''
      setFaviconMsg({ type: 'success', text: 'Favicon eliminado.' })
    } catch {
      setFaviconMsg({ type: 'error', text: 'Error al eliminar el favicon' })
    } finally {
      setFaviconSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <span className="animate-spin mr-3 text-xl">↺</span> Cargando configuración...
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Identidad de la Tienda</h1>
        <p className="text-gray-500 text-sm mt-1">
          Personalizá el nombre, logo e ícono de pestaña de tu tienda.
        </p>
      </div>

      {/* Live preview */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">
          Vista previa del navbar
        </p>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-3 flex items-center gap-3 shadow-sm">
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Logo preview" className="h-8 w-auto object-contain max-w-[140px]" />
          ) : (
            <span className="text-lg font-bold text-gray-900">
              {nameInput || 'Tienda Online'}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {faviconPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={faviconPreview} alt="Favicon" className="w-4 h-4 object-contain rounded-sm" />
          ) : (
            <div className="w-4 h-4 bg-gray-200 rounded-sm" />
          )}
          <span className="text-xs text-gray-500 font-medium">
            {nameInput || 'Tienda Online'} — pestaña del navegador
          </span>
        </div>
      </div>

      {/* ── Store name ── */}
      <SectionCard
        title="Nombre de la tienda"
        description="Se muestra en el navbar, pie de página y pestaña del navegador cuando no hay favicon."
      >
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label htmlFor="store-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="store-name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ej: Mi Tienda Online"
              maxLength={60}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">{nameInput.length}/60 caracteres</p>
          </div>
          {nameMsg && <StatusMessage type={nameMsg.type} message={nameMsg.text} />}
          <button
            type="submit"
            disabled={nameSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {nameSaving ? 'Guardando...' : 'Guardar nombre'}
          </button>
        </form>
      </SectionCard>

      {/* ── Logo ── */}
      <SectionCard
        title="Logo de la tienda"
        description="Reemplaza el nombre de texto en el navbar. Usá PNG con fondo transparente para mejores resultados."
      >
        <form onSubmit={handleSaveLogo} className="space-y-4">
          {/* Current logo preview */}
          {logoPreview && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreview}
                alt="Logo actual"
                className="h-12 w-auto object-contain max-w-[200px]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">Logo actual</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {branding.store_logo_url ? 'Guardado en el servidor' : 'Pendiente de guardar'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={logoSaving}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {logoPreview ? 'Reemplazar logo' : 'Subir logo'}
            </label>
            <input
              ref={logoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoFileChange}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer"
            />
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">✓ PNG transparente</span>
              <span className="flex items-center gap-1">✓ SVG vectorial</span>
              <span className="flex items-center gap-1">✓ Altura recomendada: 40px</span>
            </div>
          </div>

          {logoMsg && <StatusMessage type={logoMsg.type} message={logoMsg.text} />}

          <button
            type="submit"
            disabled={logoSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {logoSaving ? 'Guardando...' : logoPreview && logoRef.current?.files?.[0] ? 'Subir y guardar logo' : 'Guardar logo'}
          </button>
        </form>
      </SectionCard>

      {/* ── Favicon ── */}
      <SectionCard
        title="Ícono de pestaña (favicon)"
        description="Aparece en la pestaña del navegador, marcadores y resultados de búsqueda. Usá un ícono cuadrado simple."
      >
        <form onSubmit={handleSaveFavicon} className="space-y-4">
          {/* Favicon preview */}
          {faviconPreview && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-16 h-16 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={faviconPreview}
                  alt="Favicon actual"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Favicon actual</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={faviconPreview} alt="" className="w-4 h-4 object-contain" />
                  <span className="text-xs text-gray-400">Vista previa en pestaña</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFavicon}
                disabled={faviconSaving}
                className="ml-auto text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {faviconPreview ? 'Reemplazar favicon' : 'Subir favicon'}
            </label>
            <input
              ref={faviconRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/x-icon"
              onChange={handleFaviconFileChange}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer"
            />
            <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 mb-1.5">📐 Especificaciones recomendadas</p>
              <ul className="text-xs text-blue-600 space-y-0.5">
                <li>• Tamaño: <strong>32×32 px</strong> o <strong>64×64 px</strong> (cuadrado exacto)</li>
                <li>• Formato: PNG con fondo transparente</li>
                <li>• Diseño simple y reconocible a tamaño pequeño</li>
                <li>• Peso máximo: 50 KB</li>
              </ul>
            </div>
          </div>

          {faviconMsg && <StatusMessage type={faviconMsg.type} message={faviconMsg.text} />}

          <button
            type="submit"
            disabled={faviconSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {faviconSaving ? 'Guardando...' : 'Guardar favicon'}
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
