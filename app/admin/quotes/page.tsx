
import Link from 'next/link'
import { getPendingQuotes } from '@/lib/quotes/getPendingQuotes'

export default async function QuotesPage() {
  const quotes = await getPendingQuotes()

  return (
    <div>
      <h1>Cotizaciones en borrador</h1>

      {quotes.length === 0 && (
        <p style={{ opacity: 0.7 }}>
          No hay cotizaciones en borrador o no se pudieron cargar.
        </p>
      )}

      {quotes.map(quote => (
        <div
          key={quote.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <strong>{quote.folio ?? quote.id}</strong><br />
            <span>{quote.client_name ?? '—'}</span>
          </div>

          <Link href={`/admin/quotes/${quote.id}`}>
            <button>Gestionar</button>
          </Link>
        </div>
      ))}
    </div>
  )
}
