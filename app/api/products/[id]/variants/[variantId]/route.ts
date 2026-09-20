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

// PUT /api/products/[id]/variants/[variantId] — update stock (and optionally size/color)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { id, variantId } = await params

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })

    const { size, color, stock } = body

    const fields: Record<string, string> = {}
    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) {
      fields.stock = 'El stock debe ser un número >= 0'
    }
    if (Object.keys(fields).length > 0) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', fields }, { status: 400 })
    }

    const data: { size?: string | null; color?: string | null; stock?: number } = {}
    if (size !== undefined) data.size = size ? String(size).trim() : null
    if (color !== undefined) data.color = color ? String(color).trim() : null
    if (stock !== undefined) data.stock = Number(stock)

    const variant = await prisma.productVariant.update({
      where: { id: variantId, productId: id },
      data,
    })

    return NextResponse.json({ variant }, { status: 200 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: string }).code
      if (code === 'P2025') return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
      if (code === 'P2002') return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { variant: 'Ya existe una variante con ese talle y color' } },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// DELETE /api/products/[id]/variants/[variantId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { id, variantId } = await params

  try {
    await prisma.productVariant.delete({
      where: { id: variantId, productId: id },
    })
    return new Response(null, { status: 204 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err &&
      (err as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
