import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// 5 MB limit
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  // 1. Verify ADMIN JWT
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const payload = await verifyJWT(token)
  if (!payload) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  // 2. Verify Cloudinary env vars
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Missing Cloudinary environment variables')
    return NextResponse.json({ error: 'STORAGE_NOT_CONFIGURED' }, { status: 500 })
  }

  // 3. Parse form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'INVALID_FORM_DATA' }, { status: 400 })
  }

  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'NO_FILE' }, { status: 400 })

  // 4. Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'INVALID_FILE_TYPE' }, { status: 422 })
  }

  // 5. Validate size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'FILE_TOO_LARGE', maxSizeMB: MAX_SIZE_BYTES / 1024 / 1024 },
      { status: 413 }
    )
  }

  // 6. Upload to Cloudinary via REST API (no SDK needed)
  try {
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    // Generate signature for authenticated upload
    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'gbdetailing'

    // Build the string to sign
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
    const signature = await generateSHA1(`${paramsToSign}${apiSecret}`)

    // Build multipart form for Cloudinary
    const uploadForm = new FormData()
    uploadForm.append('file', dataUri)
    uploadForm.append('api_key', apiKey)
    uploadForm.append('timestamp', String(timestamp))
    uploadForm.append('signature', signature)
    uploadForm.append('folder', folder)

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: uploadForm }
    )

    if (!cloudinaryRes.ok) {
      const err = await cloudinaryRes.json().catch(() => ({}))
      console.error('Cloudinary upload error:', err)
      return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 500 })
    }

    const result = await cloudinaryRes.json()
    return NextResponse.json({ url: result.secure_url as string }, { status: 201 })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 500 })
  }
}

// Simple SHA-1 using Web Crypto (available in Edge and Node.js runtimes)
async function generateSHA1(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
