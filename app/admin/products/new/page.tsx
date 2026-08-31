'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
}

interface FormState {
  title: string
  description: string
  price: string
  categoryId: string
  stock: string
  isNew: boolean
}

interface SelectedImage {
  file: File
  previewUrl: string
}

// Helper error class to carry per-field validation errors from upload step
class FieldError extends Error {
  fields: Record<string, string>
  constructor(fields: Record<string, string>) {
    super('Field validation error')
    this.fields = fields
  }
}

const MAX_IMAGES = 8

export default function CreateProductPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    price: '',
    categoryId: '',
    stock: '0',
    isNew: false,
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])

  // Load categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        if (!res.ok) throw new Error('Error al cargar categorías')
        const data = await res.json()
        setCategories(data.categories ?? [])
      } catch (err) {
        console.error('Error fetching categories:', err)
        setGlobalError('No se pudieron cargar las categorías. Recarga la página.')
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const remaining = MAX_IMAGES - selectedImages.length
    const toAdd = files.slice(0, remaining)

    const newImages: SelectedImage[] = toAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setSelectedImages((prev) => [...prev, ...newImages])
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (fieldErrors.imageUrl) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.imageUrl
        return next
      })
    }
  }

  function removeImage(index: number) {
    setSelectedImages((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].previewUrl)
      next.splice(index, 1)
      return next
    })
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('image', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.error === 'INVALID_FILE_TYPE') {
        throw new FieldError({ imageUrl: 'Solo se permiten imágenes JPEG, PNG o WebP' })
      }
      throw new Error('Error al subir la imagen')
    }

    const data = await res.json()
    return data.url as string
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setGlobalError('')

    // Client-side validation
    const clientErrors: Record<string, string> = {}
    if (!form.title.trim()) {
      clientErrors.title = 'El título es requerido'
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      clientErrors.price = 'El precio debe ser mayor que 0'
    }
    if (!form.categoryId) {
      clientErrors.categoryId = 'La categoría es requerida'
    }
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      return
    }

    setSubmitting(true)

    try {
      // 1. Upload images sequentially, collect URLs
      const uploadedUrls: string[] = []
      for (const img of selectedImages) {
        const url = await uploadImage(img.file)
        uploadedUrls.push(url)
      }

      // 2. Create product via POST /api/products (FormData)
      const productFormData = new FormData()
      productFormData.append('title', form.title.trim())
      productFormData.append('description', form.description.trim())
      productFormData.append('price', form.price)
      productFormData.append('categoryId', form.categoryId)
      productFormData.append('stock', form.stock || '0')
      productFormData.append('isNew', String(form.isNew))

      if (uploadedUrls.length > 0) {
        // Primary image (backward compat)
        productFormData.append('imageUrl', uploadedUrls[0])
        // All images as comma-separated list
        productFormData.append('imageUrls', uploadedUrls.join(','))
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        body: productFormData,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data.error === 'VALIDATION_ERROR' && data.fields) {
          setFieldErrors(data.fields)
          return
        }
        setGlobalError(data.error ?? 'Error al crear el producto')
        return
      }

      // 3. Success — redirect to product list
      router.push('/admin/products')
    } catch (err) {
      if (err instanceof FieldError) {
        setFieldErrors(err.fields)
      } else {
        console.error('Error creating product:', err)
        setGlobalError('Error inesperado. Por favor, intenta de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Producto</h1>
        <Link
          href="/admin/products"
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
        >
          ← Volver a lista
        </Link>
      </div>

      {/* Global error */}
      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {globalError}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border border-gray-200 p-6 space-y-5"
      >
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="Nombre del producto"
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              fieldErrors.title ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            placeholder="Descripción del producto (opcional)"
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
              fieldErrors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
          )}
        </div>

        {/* Price + Stock row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Precio <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                className={`w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  fieldErrors.price ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {fieldErrors.price && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p>
            )}
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={handleChange}
              placeholder="0"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.stock ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {fieldErrors.stock && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.stock}</p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          {loadingCategories ? (
            <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-400">
              Cargando categorías...
            </div>
          ) : (
            <select
              id="categoryId"
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                fieldErrors.categoryId ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
          {fieldErrors.categoryId && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.categoryId}</p>
          )}
          {!loadingCategories && categories.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No hay categorías disponibles.{' '}
              <Link href="/admin" className="underline">
                Crea una primero.
              </Link>
            </p>
          )}
        </div>

        {/* isNew checkbox */}
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <input
            id="isNew"
            name="isNew"
            type="checkbox"
            checked={form.isNew}
            onChange={(e) => setForm((prev) => ({ ...prev, isNew: e.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="isNew" className="text-sm cursor-pointer">
            <span className="font-semibold text-green-800">Marcar como Nuevo</span>
            <p className="text-green-700 text-xs mt-0.5">
              Aparecerá con la etiqueta <strong>"Nuevo"</strong> en el catálogo y se mostrará primero en la lista de productos.
            </p>
          </label>
        </div>

        {/* Multi-image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Imágenes{' '}
            <span className="text-gray-400 font-normal">(hasta {MAX_IMAGES}, opcional)</span>
          </label>

          {/* Thumbnail grid */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative group/thumb rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={`Imagen ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Order badge */}
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/thumb:opacity-100 transition hover:bg-red-600"
                    aria-label={`Eliminar imagen ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedImages.length < MAX_IMAGES && (
            <>
              <input
                id="images"
                name="images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                ref={fileInputRef}
                onChange={handleFilesChange}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer"
              />
              <p className="mt-1 text-xs text-gray-400">
                {selectedImages.length === 0
                  ? 'Seleccioná hasta 8 imágenes. La primera será la imagen principal.'
                  : `${selectedImages.length} imagen${selectedImages.length > 1 ? 'es' : ''} seleccionada${selectedImages.length > 1 ? 's' : ''}. Podés agregar ${MAX_IMAGES - selectedImages.length} más.`}
              </p>
            </>
          )}

          {fieldErrors.imageUrl && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.imageUrl}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creando...
              </>
            ) : (
              'Crear Producto'
            )}
          </button>
          <Link
            href="/admin/products"
            className="px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
