import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { ProductDetailClient } from './ProductDetailClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

// ─── Dynamic metadata per product ────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const [product, settings] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        select: {
          title: true,
          description: true,
          price: true,
          imageUrl: true,
          active: true,
          category: { select: { name: true } },
        },
      }),
      prisma.setting.findMany({ where: { key: { in: ['store_name'] } } }),
    ])

    if (!product || !product.active) {
      return { title: 'Producto no disponible' }
    }

    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
    const storeName = settingsMap.store_name || 'Tienda Online'
    const title = `${product.title} — ${storeName}`
    const description = product.description
      ? product.description.slice(0, 160)
      : `Comprá ${product.title} en ${storeName}. Pedidos por WhatsApp.`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: product.imageUrl ? [{ url: product.imageUrl, alt: product.title }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: product.imageUrl ? [product.imageUrl] : [],
      },
    }
  } catch {
    return { title: 'Producto' }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params

  let product = null
  let storeName = 'Tienda Online'

  try {
    const [productData, settings] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: 'asc' } },
        },
      }),
      prisma.setting.findUnique({ where: { key: 'store_name' } }),
    ])
    product = productData
    storeName = settings?.value || 'Tienda Online'
  } catch {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm p-8 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Error al cargar</h2>
        <p className="text-gray-600 mb-6">Error de conexión.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (!product || !product.active) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm p-8 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Producto no disponible</h2>
        <p className="text-gray-600 mb-6">Este producto no está disponible actualmente.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  // ─── JSON-LD structured data (schema.org Product) ────────────────────────────
  const allImages =
    product.images && product.images.length > 0
      ? product.images.map((i) => i.url)
      : product.imageUrl
      ? [product.imageUrl]
      : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || undefined,
    image: allImages,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      price: product.price,
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: storeName,
      },
    },
    category: product.category.name,
  }

  return (
    <>
      {/* JSON-LD for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb — semantic nav for SEO */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-900 transition">Inicio</Link>
            </li>
            <li aria-hidden="true" className="text-gray-300">›</li>
            <li>
              <Link href={`/?category=${product.category.id}`} className="hover:text-gray-900 transition">
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden="true" className="text-gray-300">›</li>
            <li className="text-gray-900 font-medium truncate max-w-[200px]">{product.title}</li>
          </ol>
        </nav>

        <ProductDetailClient product={product as any} />
      </div>
    </>
  )
}
