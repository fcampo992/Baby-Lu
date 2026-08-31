import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signJWT } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body ?? {}

    // 1. Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { ...((!email) && { email: 'required' }), ...((!password) && { password: 'required' }) } },
        { status: 400 }
      )
    }

    // 2. Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: String(email) },
    })

    // 3. Verify password — use generic error to avoid user enumeration
    const passwordMatch =
      user ? await bcrypt.compare(String(password), user.password) : false

    if (!user || !passwordMatch) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    // 4. Sign JWT
    const token = await signJWT({
      sub: user.id,
      role: user.role as 'ADMIN' | 'CUSTOMER',
      name: user.name,
    })

    // 5. Build response and set HttpOnly cookie
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    )

    const isProd = process.env.NODE_ENV === 'production'
    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: isProd,
      maxAge: 7 * 24 * 3600,
    })

    return response
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    // Never expose internal error details in production
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}
