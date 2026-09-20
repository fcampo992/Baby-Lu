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

// GET /api/variant-options?type=SIZE|COLOR
// Returns all options, optionally filtered by type
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? undefined

    const options = await prisma.variantOption.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: 'asc' }, { order: 'asc' }, { value: 'asc' }],
    })

    return NextResponse.json({ options }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// POST /api/variant-options — ADMIN only
// Body: { type: "SIZE" | "COLOR", value: string, order?: number }
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })

    const { type, value, order } = body

    const fields: Record<string, string> = {}
    if (!type || !['SIZE', 'COLOR'].includes(type)) {
      fields.type = 'Debe ser "SIZE" o "COLOR"'
    }
    if (!value || String(value).trim() === '') {
      fields.value = 'El valor es requerido'
    }
    if (Object.keys(fields).length > 0) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', fields }, { status: 400 })
    }

    const option = await prisma.variantOption.create({
      data: {
        type: String(type),
        value: String(value).trim(),
        order: typeof order === 'number' ? order : 0,
      },
    })

    return NextResponse.json({ option }, { status: 201 })
  } catch (err: unknown) {
    if (
      typeof err === 'object' && err !== null &&
      'code' in err && (err as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { value: 'Ya existe esta opción' } },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
