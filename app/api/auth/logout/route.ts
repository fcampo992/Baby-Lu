import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  const isProd = process.env.NODE_ENV === 'production'
  response.cookies.set('token', '', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isProd,
    maxAge: 0,
  })
  return response
}
