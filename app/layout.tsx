import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/components/CartProvider'
import { prisma } from '@/lib/prisma'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

async function getBrandingSettings() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ['store_name', 'store_logo_url', 'store_favicon_url'] } },
    })
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
    return {
      storeName: map.store_name || 'Tienda Online',
      logoUrl: map.store_logo_url || null,
      faviconUrl: map.store_favicon_url || null,
    }
  } catch {
    return { storeName: 'Tienda Online', logoUrl: null, faviconUrl: null }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { storeName, faviconUrl, logoUrl } = await getBrandingSettings()

  const description = `Bienvenido a ${storeName}. Explorá nuestros productos y realizá tus pedidos por WhatsApp.`

  return {
    title: {
      default: storeName,
      template: `%s — ${storeName}`,
    },
    description,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    ),
    openGraph: {
      type: 'website',
      locale: 'es_AR',
      siteName: storeName,
      title: storeName,
      description,
      images: logoUrl ? [{ url: logoUrl, alt: storeName }] : [],
    },
    twitter: {
      card: 'summary',
      title: storeName,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
      },
    },
    icons: faviconUrl
      ? { icon: faviconUrl, apple: faviconUrl, shortcut: faviconUrl }
      : { icon: '/favicon.ico' },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { storeName, logoUrl, faviconUrl } = await getBrandingSettings()

  // JSON-LD for the store (Organization schema)
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeName,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    ...(logoUrl ? { logo: logoUrl } : {}),
  }

  return (
    <html lang="es">
      <head>
        {faviconUrl && <link rel="icon" href={faviconUrl} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <CartProvider storeName={storeName} logoUrl={logoUrl}>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}
