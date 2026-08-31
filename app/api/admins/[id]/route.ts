import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const payload = await verifyJWT(token)
  if (!payload) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { id } = await params

  if (id === payload.sub)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  try {
    await prisma.user.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2025')
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
