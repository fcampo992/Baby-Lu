import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

interface RegisterBody {
  name?: unknown
  email?: unknown
  password?: unknown
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let body: RegisterBody
  try {
    body = (await request.json()) as RegisterBody
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
  } else if (password.length < 6) {
    fields.password = 'La contraseña debe tener al menos 6 caracteres'
  }

  if (Object.keys(fields).length > 0) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(password as string, 12)

  try {
    const user = await prisma.user.create({
      data: {
        name: (name as string).trim(),
        email: (email as string).trim().toLowerCase(),
        password: hashedPassword,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: unknown) {
    // Prisma unique constraint violation
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

    console.error('[POST /api/auth/register]', error)
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}
