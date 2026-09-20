import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

async function requireAdmin() {
  const token = (await cookies()).get('token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

// GET /api/products/[id]/variants
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      orderBy: [{ size: 'asc' }, { color: 'asc' }],
    })
    return NextResponse.json({ variants }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// POST /api/products/[id]/variants — create a new variant
// Body JSON: { size?: string, color?: string, stock: number }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { id } = await params

  // Verify product exists
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })

    const { size, color, stock } = body

    // Must have at least one of size or color
    const fields: Record<string, string> = {}
    if (!size && !color) {
      fields.variant = 'Debe especificar al menos talle o color'
    }
    if (stock === undefined || stock === null || isNaN(Number(stock)) || Number(stock) < 0) {
      fields.stock = 'El stock debe ser un número >= 0'
    }
    if (Object.keys(fields).length > 0) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', fields }, { status: 400 })
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        size: size ? String(size).trim() : null,
        color: color ? String(color).trim() : null,
        stock: Number(stock),
      },
    })

    return NextResponse.json({ variant }, { status: 201 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err &&
      (err as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { variant: 'Ya existe una variante con ese talle y color' } },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
