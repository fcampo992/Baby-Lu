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

// GET /api/banners — returns active banners ordered by order ASC (public)
// Pass ?all=true to get all banners (will be validated via admin auth)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const showAll = searchParams.get('all') === 'true'

    if (showAll) {
      // Require admin for full list
      const admin = await requireAdmin()
      if (!admin) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
      }
      const banners = await prisma.banner.findMany({
        orderBy: { order: 'asc' },
      })
      return NextResponse.json({ banners })
    }

    const banners = await prisma.banner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ banners })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

// POST /api/banners — ADMIN only, creates a banner
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, subtitle, imageUrl, linkUrl, buttonText, active, order } = body ?? {}

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { title: 'El título es requerido' } },
        { status: 400 }
      )
    }

    const banner = await prisma.banner.create({
      data: {
        title: title.trim(),
        subtitle: subtitle ? String(subtitle).trim() : null,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        linkUrl: linkUrl ? String(linkUrl).trim() : null,
        buttonText: buttonText ? String(buttonText).trim() : null,
        active: active !== undefined ? Boolean(active) : true,
        order: order !== undefined ? Number(order) : 0,
      },
    })

    return NextResponse.json({ banner }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
