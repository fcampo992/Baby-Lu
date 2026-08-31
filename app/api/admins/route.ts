import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function getAdminPayload() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  const payload = await verifyJWT(token)
  if (!payload || payload.role !== 'ADMIN') return null

  return payload
}

// GET /api/admins — ADMIN only
// Returns: 200 { admins: { id, name, email }[] }
export async function GET() {
  try {
    const payload = await getAdminPayload()
    if (!payload) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return NextResponse.json({ admins }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}

// POST /api/admins — ADMIN only
// Body: { name, email, password }
// Returns: 201 { admin: { id, name, email, role } }
// Errors: 409 EMAIL_ALREADY_EXISTS, 400 VALIDATION_ERROR
export async function POST(request: Request) {
  try {
    const payload = await getAdminPayload()
    if (!payload) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    let body: { name?: unknown; email?: unknown; password?: unknown }
    try {
      body = (await request.json()) as {
        name?: unknown
        email?: unknown
        password?: unknown
      }
    } catch {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { body: 'Invalid JSON' } },
        { status: 400 }
      )
    }

    const { name, email, password } = body
    const fields: Record<string, string> = {}

    if (!name || typeof name !== 'string' || name.trim() === '') {
      fields.name = 'El nombre es requerido'
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      fields.email = 'El email es requerido'
    } else if (!EMAIL_REGEX.test(email.trim())) {
      fields.email = 'El formato del email no es válido'
    }

    if (!password || typeof password !== 'string' || password.trim() === '') {
      fields.password = 'La contraseña es requerida'
    } else if (password.length < 8) {
      fields.password = 'La contraseña debe tener al menos 8 caracteres'
    }

    if (Object.keys(fields).length > 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password as string, 12)

    const admin = await prisma.user.create({
      data: {
        name: (name as string).trim(),
        email: (email as string).trim().toLowerCase(),
        password: hashedPassword,
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({ admin }, { status: 201 })
  } catch (error: unknown) {
    // Prisma unique constraint violation — email already exists
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'EMAIL_ALREADY_EXISTS' },
        { status: 409 }
      )
    }

    console.error('[POST /api/admins]', error)
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}
