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

// PUT /api/banners/[id] — ADMIN only, updates a banner
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { title, subtitle, imageUrl, linkUrl, buttonText, active, order } = body ?? {}

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { title: 'El título no puede estar vacío' } },
        { status: 400 }
      )
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(subtitle !== undefined ? { subtitle: subtitle ? String(subtitle).trim() : null } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl ? String(imageUrl).trim() : null } : {}),
        ...(linkUrl !== undefined ? { linkUrl: linkUrl ? String(linkUrl).trim() : null } : {}),
        ...(buttonText !== undefined ? { buttonText: buttonText ? String(buttonText).trim() : null } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(order !== undefined ? { order: Number(order) } : {}),
      },
    })

    return NextResponse.json({ banner })
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// DELETE /api/banners/[id] — ADMIN only, deletes a banner
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.banner.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
