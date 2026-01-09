
import Link from 'next/link'
import { getDraftQuotes } from '@/lib/quotes/getDraftQuotes'

export default async function QuotesPage() {
  const quotes = await getDraftQuotes()

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Cotizaciones (Borrador)</h1>

      {quotes.length === 0 && (
        <p style={{ marginTop: 16, opacity: 0.7 }}>
          No hay cotizaciones en estado DRAFT.
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        {quotes.map(q => (
          <div
            key={q.quote_id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <div>
              <strong>#{q.quote_no ?? '—'}</strong><br />
              <span>{q.customer_name ?? 'Cliente sin nombre'}</span><br />
              <small>
                {q.vehicle_text ?? 'Vehículo no especificado'} · {q.size ?? '—'} × {q.quantity ?? 1}
              </small>
            </div>

            <Link href={`/admin/quotes/${q.quote_id}`}>
              <button
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                Gestionar
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
