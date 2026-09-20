import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

// ─── Auth helper ────────────────────────────────────────────────────────────

async function requireAdmin() {
  const token = (await cookies()).get('token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

// ─── GET /api/products/[id] ──────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
        variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ product }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// ─── PUT /api/products/[id] ──────────────────────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth
  const admin = await requireAdmin()
  if (!admin) {
    const token = (await cookies()).get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  // 2. Check product exists
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // 3. Parse FormData
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields: { body: 'Invalid FormData' } },
      { status: 400 }
    )
  }

  const title = formData.get('title')
  const description = formData.get('description')
  const priceRaw = formData.get('price')
  const categoryId = formData.get('categoryId')
  const stockRaw = formData.get('stock')
  const imageUrl = formData.get('imageUrl')
  const activeRaw = formData.get('active')
  const isNewRaw = formData.get('isNew') as string | null
  const imageUrlsRaw = formData.get('imageUrls') as string | null

  // 4. Validate
  const fields: Record<string, string> = {}

  if (!title || typeof title !== 'string' || title.trim() === '') {
    fields.title = 'El título es requerido'
  }

  const price = parseFloat(String(priceRaw))
  if (priceRaw === null || priceRaw === '' || isNaN(price) || price <= 0) {
    fields.price = 'El precio debe ser mayor a 0'
  }

  if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
    fields.categoryId = 'La categoría es requerida'
  }

  if (Object.keys(fields).length > 0) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields },
      { status: 400 }
    )
  }

  const stock = stockRaw !== null ? parseInt(String(stockRaw), 10) : existing.stock
  const active =
    activeRaw !== null ? activeRaw === 'true' || activeRaw === '1' : existing.active
  const isNew =
    isNewRaw !== null ? isNewRaw === 'true' || isNewRaw === '1' : existing.isNew

  // 5. Update
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        title: (title as string).trim(),
        description:
          description && typeof description === 'string'
            ? description.trim()
            : existing.description,
        price,
        categoryId: (categoryId as string).trim(),
        stock: isNaN(stock) ? existing.stock : stock,
        active,
        isNew,
        ...(imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== ''
          ? { imageUrl: imageUrl.trim() }
          : {}),
      },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
      },
    })

    // Handle imageUrls replacement (comma-separated)
    if (imageUrlsRaw !== null && imageUrlsRaw !== undefined) {
      const urls = imageUrlsRaw.trim() !== ''
        ? imageUrlsRaw.split(',').map((u) => u.trim()).filter(Boolean)
        : []
      // Delete all existing images and recreate
      await prisma.productImage.deleteMany({ where: { productId: id } })
      if (urls.length > 0) {
        await prisma.productImage.createMany({
          data: urls.map((url, idx) => ({
            productId: id,
            url,
            order: idx,
          })),
        })
      }
    }

    return NextResponse.json({ product }, { status: 200 })
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    console.error('[PUT /api/products/[id]]', error)
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/products/[id] ───────────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth
  const admin = await requireAdmin()
  if (!admin) {
    const token = (await cookies()).get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  // 2. Delete — remove associated OrderItems first, then the product
  try {
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ])
    return new Response(null, { status: 204 })
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    console.error('[DELETE /api/products/[id]]', error)
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
