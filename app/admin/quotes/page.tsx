
import Link from 'next/link'
import { getPendingQuotes } from '@/lib/quotes/getPendingQuotes'

export default async function QuotesPage() {
  const quotes = await getPendingQuotes()

  return (
    <div>
      <h1>Cotizaciones pendientes</h1>

      {quotes.length === 0 && (
        <p>No hay cotizaciones pendientes</p>
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
            <strong>{quote.folio}</strong><br />
            <span>{quote.client_name}</span>
          </div>

          <Link href={`/admin/quotes/${quote.id}`}>
            <button>Gestionar</button>
          </Link>
        </div>
      ))}
    </div>
  )
}
