import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

// GET /api/products?categoryId=&search=&activeOnly=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const activeOnlyParam = searchParams.get('activeOnly')
    // Default to true unless explicitly set to 'false'
    const activeOnly = activeOnlyParam === null ? true : activeOnlyParam !== 'false'

    const where: {
      active?: boolean
      categoryId?: string
      OR?: Array<{ title?: { contains: string }; description?: { contains: string } }>
    } = {}

    if (activeOnly) {
      where.active = true
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (search && search.trim() !== '') {
      const term = search.trim()
      where.OR = [
        { title: { contains: term } },
        { description: { contains: term } },
      ]
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        images: { orderBy: { order: 'asc' } },
      },
      orderBy: [{ isNew: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ products }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}

// POST /api/products — ADMIN only, FormData
export async function POST(request: Request) {
  try {
    // 1. Verify JWT and ADMIN role
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    // 2. Parse FormData
    const formData = await request.formData()
    const title = formData.get('title') as string | null
    const description = (formData.get('description') as string | null) ?? ''
    const priceRaw = formData.get('price') as string | null
    const categoryId = formData.get('categoryId') as string | null
    const stockRaw = formData.get('stock') as string | null
    const imageUrl = (formData.get('imageUrl') as string | null) ?? undefined
    const isNewRaw = formData.get('isNew') as string | null
    const isNew = isNewRaw === 'true' || isNewRaw === '1'

    // 3. Validate required fields
    const fields: Record<string, string> = {}

    if (!title || title.trim() === '') {
      fields.title = 'required'
    }

    if (!priceRaw || priceRaw.trim() === '') {
      fields.price = 'required'
    } else {
      const price = parseFloat(priceRaw)
      if (isNaN(price) || price <= 0) {
        fields.price = 'must be greater than 0'
      }
    }

    if (!categoryId || categoryId.trim() === '') {
      fields.categoryId = 'required'
    }

    if (Object.keys(fields).length > 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields },
        { status: 400 }
      )
    }

    const price = parseFloat(priceRaw!)
    const stock = stockRaw ? parseInt(stockRaw, 10) : 0

    // 4. Create product
    const product = await prisma.product.create({
      data: {
        title: title!.trim(),
        description: description.trim(),
        price,
        stock: isNaN(stock) ? 0 : stock,
        imageUrl: imageUrl || null,
        categoryId: categoryId!.trim(),
        isNew,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        images: { orderBy: { order: 'asc' } },
      },
    })

    // 5. Handle imageUrls (comma-separated) → create ProductImage records
    const imageUrlsRaw = formData.get('imageUrls') as string | null
    if (imageUrlsRaw && imageUrlsRaw.trim() !== '') {
      const urls = imageUrlsRaw.split(',').map((u) => u.trim()).filter(Boolean)
      if (urls.length > 0) {
        await prisma.productImage.createMany({
          data: urls.map((url, idx) => ({
            productId: product.id,
            url,
            order: idx,
          })),
        })
      }
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}
