
import Link from 'next/link'
import { getPendingQuotes } from '@/lib/quotes/getPendingQuotes'

export default async function QuotesPage() {
  const quotes = await getPendingQuotes()

  return (
    <div>
      <h1>Cotizaciones en borrador</h1>

      {quotes.length === 0 && (
        <p style={{ opacity: 0.7 }}>
          No hay cotizaciones en borrador.
        </p>
      )}

      {quotes.map(quote => (
        <div
          key={quote.quote_id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <strong>#{quote.quote_no}</strong><br />
            <span>{quote.customer_name ?? '—'}</span><br />
            <small>
              {quote.vehicle_text ?? 'Vehículo no especificado'} · {quote.size ?? '—'} × {quote.quantity ?? 1}
            </small>
          </div>

          <Link href={`/admin/quotes/${quote.quote_id}`}>
            <button>Gestionar</button>
          </Link>
        </div>
      ))}
    </div>
  )
}
