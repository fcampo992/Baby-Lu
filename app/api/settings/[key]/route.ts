import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/settings/[key] — public, returns single setting value
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const setting = await prisma.setting.findUnique({ where: { key } })
    return NextResponse.json({ value: setting?.value ?? null })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}
