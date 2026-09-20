'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { VariantsEditor } from '@/components/admin/VariantsEditor'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
}

interface ProductImage {
  url: string
  order: number
}

interface Product {
  id: string
  title: string
  description: string
  price: number
  stock: number
  imageUrl: string | null
  active: boolean
  isNew: boolean
  categoryId: string
  category: { id: string; name: string }
  images?: ProductImage[]
}

interface FormState {
  title: string
  description: string
  price: string
  categoryId: string
  stock: string
  active: boolean
  isNew: boolean
}

interface NewImage {
  file: File
  previewUrl: string
}

// Helper to carry per-field errors thrown from async steps (e.g. upload)
class FieldError extends Error {
  fields: Record<string, string>
  constructor(fields: Record<string, string>) {
    super('Field validation error')
    this.fields = fields
  }
}

const MAX_IMAGES = 8

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Remote data
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  // Loading states
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form state (populated once product loads)
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    price: '',
    categoryId: '',
    stock: '0',
    active: true,
    isNew: false,
  })

  // Existing images kept from server (removable)
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  // New images selected by user
  const [newImages, setNewImages] = useState<NewImage[]>([])

  // Errors & submission
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ─── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) throw new Error('Error al cargar el producto')
        const data = await res.json()
        const p: Product = data.product
        setProduct(p)
        // Pre-fill form with current values
        setForm({
          title: p.title,
          description: p.description ?? '',
          price: String(p.price),
          categoryId: p.category.id,
          stock: String(p.stock),
          active: p.active,
          isNew: p.isNew,
        })
        // Load existing images
        if (p.images && p.images.length > 0) {
          setExistingImages([...p.images].sort((a, b) => a.order - b.order))
        } else if (p.imageUrl) {
          // Fallback: treat legacy imageUrl as single existing image
          setExistingImages([{ url: p.imageUrl, order: 0 }])
        }
      } catch (err) {
        console.error('Error fetching product:', err)
        setGlobalError('No se pudo cargar el producto. Recarga la página.')
      } finally {
        setLoadingProduct(false)
      }
    }

    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        if (!res.ok) throw new Error('Error al cargar categorías')
        const data = await res.json()
        setCategories(data.categories ?? [])
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchProduct()
    fetchCategories()
  }, [id])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setForm((prev) => ({ ...prev, [name]: newValue }))
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

    const totalExisting = existingImages.length + newImages.length
    const remaining = MAX_IMAGES - totalExisting
    const toAdd = files.slice(0, remaining)

    const added: NewImage[] = toAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setNewImages((prev) => [...prev, ...added])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeExistingImage(index: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  function removeNewImage(index: number) {
    setNewImages((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].previewUrl)
      next.splice(index, 1)
      return next
    })
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('image', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: fd,
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
      // 1. Upload new images sequentially
      const newUploadedUrls: string[] = []
      for (const img of newImages) {
        const url = await uploadImage(img.file)
        newUploadedUrls.push(url)
      }

      // 2. Combine existing kept + newly uploaded
      const allImageUrls = [
        ...existingImages.map((img) => img.url),
        ...newUploadedUrls,
      ]

      // 3. Build FormData for PUT /api/products/[id]
      const productFormData = new FormData()
      productFormData.append('title', form.title.trim())
      productFormData.append('description', form.description.trim())
      productFormData.append('price', form.price)
      productFormData.append('categoryId', form.categoryId)
      productFormData.append('stock', form.stock || '0')
      productFormData.append('active', String(form.active))
      productFormData.append('isNew', String(form.isNew))

      // Always send imageUrls (even empty to clear all)
      productFormData.append('imageUrls', allImageUrls.join(','))

      if (allImageUrls.length > 0) {
        // Primary image (backward compat)
        productFormData.append('imageUrl', allImageUrls[0])
      } else if (product?.imageUrl) {
        // Keep existing imageUrl if no images managed
        productFormData.append('imageUrl', product.imageUrl)
      }

      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        body: productFormData,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 404) {
          setGlobalError('El producto no fue encontrado.')
          return
        }
        if (data.error === 'VALIDATION_ERROR' && data.fields) {
          setFieldErrors(data.fields)
          return
        }
        setGlobalError(data.error ?? 'Error al actualizar el producto')
        return
      }

      // 4. Success — go back to list
      router.push('/admin/products')
    } catch (err) {
      if (err instanceof FieldError) {
        setFieldErrors(err.fields)
      } else {
        console.error('Error updating product:', err)
        setGlobalError('Error inesperado. Por favor, intenta de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render states ─────────────────────────────────────────────────────────

  if (loadingProduct) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg
          className="animate-spin h-8 w-8 text-indigo-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="ml-3 text-gray-500">Cargando producto...</span>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xl text-gray-500 mb-4">Producto no encontrado.</p>
        <Link
          href="/admin/products"
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          ← Volver a lista
        </Link>
      </div>
    )
  }

  const totalImages = existingImages.length + newImages.length

  // ─── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Producto</h1>
          {product && (
            <p className="mt-1 text-sm text-gray-500 truncate max-w-sm">{product.title}</p>
          )}
        </div>
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
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <input
            id="active"
            name="active"
            type="checkbox"
            checked={form.active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-700">
            Producto activo (visible en la tienda)
          </label>
        </div>

        {/* isNew toggle */}
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
              Aparecerá con la etiqueta <strong>"Nuevo"</strong> en el catálogo y se mostrará primero en la lista.
            </p>
          </label>
        </div>

        {/* Multi-image management */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imágenes{' '}
            <span className="text-gray-400 font-normal">(hasta {MAX_IMAGES})</span>
          </label>

          {/* Combined thumbnail grid (existing + new) */}
          {totalImages > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {existingImages.map((img, idx) => (
                <div key={`existing-${idx}`} className="relative group/thumb rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Imagen ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExistingImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/thumb:opacity-100 transition hover:bg-red-600"
                    aria-label={`Eliminar imagen ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {newImages.map((img, idx) => (
                <div key={`new-${idx}`} className="relative group/thumb rounded-lg overflow-hidden border border-indigo-200 aspect-square bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={`Nueva imagen ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 bg-indigo-600/80 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {existingImages.length + idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/thumb:opacity-100 transition hover:bg-red-600"
                    aria-label={`Eliminar nueva imagen ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalImages < MAX_IMAGES && (
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
                {totalImages === 0
                  ? 'Sin imágenes. Podés agregar hasta 8.'
                  : `${totalImages} imagen${totalImages > 1 ? 'es' : ''}. Podés agregar ${MAX_IMAGES - totalImages} más.`}
              </p>
            </>
          )}

          {fieldErrors.imageUrl && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.imageUrl}</p>
          )}
        </div>

        {/* Variants section */}
        <div className="border-t border-gray-100 pt-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Variantes (talle / color)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cada variante tiene su propio stock. Los cambios se guardan individualmente con el botón 💾.
            </p>
          </div>
          <VariantsEditor productId={id} />
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
                Guardando...
              </>
            ) : (
              'Guardar cambios'
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
