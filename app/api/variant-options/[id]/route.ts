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

// PUT /api/variant-options/[id] — update value or order
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { id } = await params

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })

    const { value, order } = body
    const fields: Record<string, string> = {}
    if (value !== undefined && String(value).trim() === '') {
      fields.value = 'El valor no puede estar vacío'
    }
    if (Object.keys(fields).length > 0) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', fields }, { status: 400 })
    }

    const data: { value?: string; order?: number } = {}
    if (value !== undefined) data.value = String(value).trim()
    if (typeof order === 'number') data.order = order

    const option = await prisma.variantOption.update({ where: { id }, data })
    return NextResponse.json({ option }, { status: 200 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: string }).code
      if (code === 'P2025') return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
      if (code === 'P2002') return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { value: 'Ya existe esta opción' } },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// DELETE /api/variant-options/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { id } = await params

  try {
    await prisma.variantOption.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err &&
      (err as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
