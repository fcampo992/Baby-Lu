import { Navbar } from '@/components/Navbar'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getStoreName(): Promise<string> {
  try {
    const s = await prisma.setting.findUnique({ where: { key: 'store_name' } })
    return s?.value || 'Tienda Online'
  } catch {
    return 'Tienda Online'
  }
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const storeName = await getStoreName()

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <Navbar />
      <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="border-t border-gray-200 bg-white py-12 text-center text-sm text-gray-500 mt-auto">
        <p className="font-medium">
          © {new Date().getFullYear()} {storeName}. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
