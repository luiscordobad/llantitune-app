
import Link from 'next/link'
import { getQuotesDraftAndSent } from '@/lib/quotes/getQuotesDraftAndSent'

export default async function QuotesPage() {
  const quotes = await getQuotesDraftAndSent()

  const draft = quotes.filter(q => q.status === 'DRAFT')
  const sent = quotes.filter(q => q.status === 'SENT')

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Cotizaciones</h1>

      {/* DRAFT */}
      <h2 style={{ marginTop: 24 }}>Borrador</h2>
      {draft.length === 0 && (
        <p style={{ opacity: 0.6 }}>No hay cotizaciones en borrador.</p>
      )}
      {draft.map(q => (
        <Row key={q.quote_id} q={q} />
      ))}

      {/* SENT */}
      <h2 style={{ marginTop: 32 }}>Enviadas</h2>
      {sent.length === 0 && (
        <p style={{ opacity: 0.6 }}>No hay cotizaciones enviadas.</p>
      )}
      {sent.map(q => (
        <Row key={q.quote_id} q={q} />
      ))}
    </div>
  )
}

function Row({ q }: { q: any }) {
  return (
    <div
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
  )
}
