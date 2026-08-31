import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

// GET /api/settings — returns all settings (ADMIN only)
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const settings = await prisma.setting.findMany()
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// PATCH /api/settings — upserts a setting (ADMIN only)
export async function PATCH(request: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { key, value } = body ?? {}

    if (!key || typeof key !== 'string' || key.trim() === '') {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { key: 'La clave es requerida' } },
        { status: 400 }
      )
    }
    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { value: 'El valor es requerido' } },
        { status: 400 }
      )
    }

    const setting = await prisma.setting.upsert({
      where: { key: key.trim() },
      update: { value: String(value) },
      create: { key: key.trim(), value: String(value) },
    })

    return NextResponse.json({ setting })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
