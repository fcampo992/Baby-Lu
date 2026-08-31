import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'

const ADMIN_ROUTES = /^\/admin(?!\/login)/
const CUSTOMER_ROUTES = /^\/orders(\/|$)/

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  if (ADMIN_ROUTES.test(pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const payload = await verifyJWT(token)
    if (!payload || payload.role !== 'ADMIN') {
      // Clear invalid/expired token and redirect
      const res = NextResponse.redirect(new URL('/admin/login', request.url))
      res.cookies.set('token', '', { maxAge: 0, path: '/' })
      return res
    }
  }

  if (CUSTOMER_ROUTES.test(pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const payload = await verifyJWT(token)
    if (!payload) {
      const res = NextResponse.redirect(new URL('/login', request.url))
      res.cookies.set('token', '', { maxAge: 0, path: '/' })
      return res
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/orders', '/orders/:path*'],
}
