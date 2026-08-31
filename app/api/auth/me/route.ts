import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) {
    return NextResponse.json({ user: null })
  }

  const payload = await verifyJWT(token)
  if (!payload) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({ user: payload })
}
