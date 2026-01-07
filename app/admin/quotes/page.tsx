'use client'

import { useState } from 'react'
import QuoteManageModal from '@/app/components/quotes/QuoteManageModal'

export default function QuotesPage() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setLoading(true)

    const res = await fetch(
      `/api/admin/quotes/search?q=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    setRows(data.rows ?? [])
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2>Cotizaciones</h2>
      <p style={{ opacity: 0.7 }}>
        Busca por teléfono, folio, nombre o email
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cotización…"
          onKeyDown={(e) => e.key === 'Enter' && search()}
          style={{ flex: 1 }}
        />
        <button className="btn btnPrimary" onClick={search}>
          Buscar
        </button>
      </div>

      {loading && <div>Cargando…</div>}

      {!loading && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Estatus</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.quote_id}>
                <td>{new Date(q.created_at).toLocaleDateString()}</td>
                <td>{q.quote_number}</td>
                <td>{q.customer_name}</td>
                <td>{q.customer_phone}</td>
                <td>{q.status}</td>
                <td>
                  <button
                    className="btn btnPrimary"
                    onClick={() => setActiveQuoteId(q.quote_id)}
                  >
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeQuoteId && (
        <QuoteManageModal
          quoteId={activeQuoteId}
          onClose={() => setActiveQuoteId(null)}
        />
      )}
    </div>
  )
}
