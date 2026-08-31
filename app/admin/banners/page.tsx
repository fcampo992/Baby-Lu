'use client'

import { useEffect, useState, useRef } from 'react'

interface Banner {
  id: string
  title: string
  subtitle?: string | null
  imageUrl?: string | null
  linkUrl?: string | null
  buttonText?: string | null
  active: boolean
  order: number
  createdAt: string
}

interface BannerFormData {
  title: string
  subtitle: string
  imageUrl: string
  linkUrl: string
  buttonText: string
  active: boolean
  order: string
}

const EMPTY_FORM: BannerFormData = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  buttonText: '',
  active: true,
  order: '0',
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<BannerFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url')
  const [uploading, setUploading] = useState(false)

  async function fetchAllBanners() {
    setLoading(true)
    try {
      const res = await fetch('/api/banners?all=true')
      if (res.ok) {
        const data = await res.json()
        setBanners(data.banners || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAllBanners() }, [])

  function startEdit(banner: Banner) {
    setEditingId(banner.id)
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || '',
      buttonText: banner.buttonText || '',
      active: banner.active,
      order: String(banner.order),
    })
    setImagePreview(banner.imageUrl || null)
    setUploadMode(banner.imageUrl?.startsWith('/uploads/') ? 'file' : 'url')
    setFormError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setImagePreview(null)
    setFormError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setImagePreview(null); return }
    setImagePreview(URL.createObjectURL(file))
    setForm((p) => ({ ...p, imageUrl: '' }))
  }

  async function uploadFile(file: File): Promise<string> {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error === 'INVALID_FILE_TYPE'
            ? 'Solo se permiten imágenes JPEG, PNG o WebP'
            : 'Error al subir la imagen'
        )
      }
      const data = await res.json()
      return data.url as string
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim()) { setFormError('El título es requerido'); return }

    setSaving(true)
    try {
      let finalImageUrl = form.imageUrl.trim() || null
      const file = fileInputRef.current?.files?.[0]
      if (file) finalImageUrl = await uploadFile(file)

      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        imageUrl: finalImageUrl,
        linkUrl: form.linkUrl.trim() || null,
        buttonText: form.buttonText.trim() || null,
        active: form.active,
        order: Number(form.order) || 0,
      }

      const res = editingId
        ? await fetch(`/api/banners/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (res.ok) {
        setForm(EMPTY_FORM)
        setEditingId(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        await fetchAllBanners()
      } else {
        const data = await res.json().catch(() => ({}))
        setFormError(data?.fields?.title || data?.error || 'Error al guardar el banner')
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError((prev) => ({ ...prev, [id]: '' }))
    try {
      const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' })
      if (res.status === 204) {
        setBanners((prev) => prev.filter((b) => b.id !== id))
        setConfirmDeleteId(null)
      } else {
        setDeleteError((prev) => ({ ...prev, [id]: 'Error al eliminar' }))
        setConfirmDeleteId(null)
      }
    } catch {
      setDeleteError((prev) => ({ ...prev, [id]: 'Error de red' }))
      setConfirmDeleteId(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Banners del Carrusel</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gestiona los banners que aparecen en la página principal
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-5">
          {editingId ? 'Editar banner' : 'Nuevo banner'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ej: Ofertas de verano"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
              <input type="text" value={form.subtitle}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="Descripción corta"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de destino</label>
              <input type="text" value={form.linkUrl}
                onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                placeholder="/productos o https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto del botón CTA</label>
              <input type="text" value={form.buttonText}
                onChange={(e) => setForm((p) => ({ ...p, buttonText: e.target.value }))}
                placeholder="Ver más"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de aparición</label>
              <input type="number" min="0" value={form.order}
                onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Activo (visible en la tienda)</span>
              </label>
            </div>
          </div>

          {/* Image section */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Imagen del banner</p>

            {/* Image specs info box */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-base">ℹ️</span>
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                  Especificaciones recomendadas para la imagen
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
                  <p className="text-lg font-bold text-blue-700">1280×480</p>
                  <p className="text-xs text-gray-500 mt-0.5">Resolución ideal (px)</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
                  <p className="text-lg font-bold text-blue-700">8 : 3</p>
                  <p className="text-xs text-gray-500 mt-0.5">Relación de aspecto</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
                  <p className="text-lg font-bold text-blue-700">≤ 200 KB</p>
                  <p className="text-xs text-gray-500 mt-0.5">Peso máximo</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
                  <p className="text-lg font-bold text-blue-700">JPG / WebP</p>
                  <p className="text-xs text-gray-500 mt-0.5">Formato recomendado</p>
                </div>
              </div>
              <ul className="text-xs text-blue-700 space-y-1 mt-1 pl-1">
                <li>• Para Retina/4K usá <strong>2560×960 px</strong> manteniendo la misma relación 8:3</li>
                <li>• Si la imagen no es 8:3, se verán barras grises a los costados</li>
                <li>• Diseñá el contenido importante centrado y alejado de los bordes</li>
                <li>• PNG solo si necesitás fondo transparente, pesa más que JPG</li>
              </ul>
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit text-sm">
              <button type="button"
                onClick={() => {
                  setUploadMode('url')
                  setImagePreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className={`px-4 py-1.5 transition ${uploadMode === 'url' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                URL externa
              </button>
              <button type="button"
                onClick={() => {
                  setUploadMode('file')
                  setForm((p) => ({ ...p, imageUrl: '' }))
                }}
                className={`px-4 py-1.5 transition ${uploadMode === 'file' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Subir archivo
              </button>
            </div>

            {uploadMode === 'url' ? (
              <div>
                <input type="text" value={form.imageUrl ?? ''}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, imageUrl: e.target.value }))
                    setImagePreview(e.target.value || null)
                  }}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Pegá la URL completa de la imagen</p>
              </div>
            ) : (
              <div>
                <input ref={fileInputRef} type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">Formatos: JPEG, PNG, WebP</p>
              </div>
            )}

            {imagePreview && (
              <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                <button type="button"
                  onClick={() => {
                    setImagePreview(null)
                    setForm((p) => ({ ...p, imageUrl: '' }))
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80 transition"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {formError && <p className="text-red-500 text-sm">{formError}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving || uploading}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {uploading ? 'Subiendo imagen...' : saving ? 'Guardando...' : editingId ? 'Actualizar banner' : '+ Crear banner'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Banners list */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Banners existentes{' '}
            <span className="text-gray-400 font-normal text-sm">({banners.length})</span>
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
        ) : banners.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No hay banners. Crea uno arriba.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-20">Imagen</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Subtítulo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Orden</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {banner.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={banner.imageUrl} alt={banner.title}
                          className="w-16 h-10 object-cover rounded border border-gray-100"
                        />
                      ) : (
                        <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">Sin img</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{banner.title}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{banner.subtitle || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{banner.order}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${banner.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {banner.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {deleteError[banner.id] && (
                          <span className="text-xs text-red-500">{deleteError[banner.id]}</span>
                        )}
                        {confirmDeleteId === banner.id ? (
                          <>
                            <button onClick={() => handleDelete(banner.id)} disabled={deletingId === banner.id}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingId === banner.id ? '...' : 'Confirmar'}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(banner)}
                              className="px-3 py-1 text-xs text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setDeleteError((prev) => ({ ...prev, [banner.id]: '' }))
                                setConfirmDeleteId(banner.id)
                              }}
                              className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
