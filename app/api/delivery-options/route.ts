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

// GET /api/delivery-options?activeOnly=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const options = await prisma.deliveryOption.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ options }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// POST /api/delivery-options — ADMIN only
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })

    const { name, description, active, order } = body

    if (!name || String(name).trim() === '') {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { name: 'El nombre es requerido' } },
        { status: 400 }
      )
    }

    const option = await prisma.deliveryOption.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        active: active !== false,
        order: typeof order === 'number' ? order : 0,
      },
    })

    return NextResponse.json({ option }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
