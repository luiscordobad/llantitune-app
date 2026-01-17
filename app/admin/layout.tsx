'use client'

import React from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240 }}>
        {/* Sidebar */}
      </aside>

      <main
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {children}
      </main>
    </div>
  )
}
