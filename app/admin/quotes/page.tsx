'use client'

import { useState } from 'react'

export default function QuotesPage() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [activeQuote, setActiveQuote] = useState<any>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

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

  async function manageQuote(quoteId: string) {
    console.log('Gestionar clicked:', quoteId)

    const res = await fetch(
      `/api/quotes/details?quote_id=${quoteId}`
    )
    const data = await res.json()

    console.log('Quote details:', data)

    setActiveQuote(data)
    setSelectedItemId(null)
    setSelectedLineId(null)
  }

  async function approve() {
    if (!selectedItemId || !selectedLineId) {
      alert('Selecciona una llanta o cancela la cotización')
      return
    }

    await fetch('/api/quotes/approve', {
      method: 'POST',
      body: JSON.stringify({
        quote_id: activeQuote.quote.id,
        line_id: selectedLineId,
        quote_item_id: selectedItemId
      })
    })

    alert('Cotización aprobada y enviada a taller')
    setActiveQuote(null)
  }

  async function cancelQuote() {
    await fetch('/api/quotes/cancel', {
      method: 'POST',
      body: JSON.stringify({
        quote_id: activeQuote.quote.id
      })
    })

    alert('Cotización cancelada')
    setActiveQuote(null)
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2>Cotizaciones</h2>

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
                    onClick={() => manageQuote(q.quote_id)}
                  >
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 🔥 GESTIÓN INLINE (WORKAROUND) */}
      {activeQuote && (
        <div
          style={{
            marginTop: 32,
            padding: 24,
            border: '2px solid #2563eb',
            borderRadius: 8,
            background: '#f8fafc'
          }}
        >
          <h3>
            Gestionando cotización {activeQuote.quote.folio}
          </h3>

          {activeQuote.lines.map((line: any) => (
            <div key={line.id} style={{ marginTop: 16 }}>
              <strong>
                {line.measure} – Cantidad {line.quantity}
              </strong>

              {line.items.map((item: any) => (
                <div key={item.quote_item_id}>
                  <label>
                    <input
                      type="radio"
                      name={line.id}
                      checked={selectedItemId === item.quote_item_id}
                      onChange={() => {
                        setSelectedItemId(item.quote_item_id)
                        setSelectedLineId(line.id)
                      }}
                    />{' '}
                    {item.brand} {item.model} – ${item.price_each} (Stock {item.stock})
                  </label>
                </div>
              ))}
            </div>
          ))}

          <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
            <button
              className="btn"
              style={{ background: '#dc2626', color: 'white' }}
              onClick={cancelQuote}
            >
              Cancelar cotización
            </button>

            <button
              className="btn btnPrimary"
              onClick={approve}
            >
              Aprobar y enviar a taller
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
