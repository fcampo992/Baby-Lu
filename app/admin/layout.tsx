import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      {/*
        On mobile: pt-14 offsets the fixed top bar (h-14).
        On desktop (lg+): no top bar, so no offset needed.
      */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto pt-[calc(3.5rem+1rem)] lg:pt-8">
        {children}
      </main>
    </div>
  )
}
