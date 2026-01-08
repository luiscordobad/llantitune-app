
'use client'

import Link from 'next/link'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <strong>Llantitune</strong>
        <span className="badge">Admin</span>
      </div>

      <nav className="sidebar-nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/quote">Cotizar</Link>
        <Link href="/orders">Órdenes</Link>
        <Link href="/clients">Clientes</Link>
        <Link href="/admin/quotes">Cotizaciones</Link>
        <Link href="/reports">Reportes</Link>
        <Link href="/admin">Admin</Link>
      </nav>

      <div className="sidebar-footer">
        <button>Cerrar sesión</button>
      </div>
    </aside>
  )
}
