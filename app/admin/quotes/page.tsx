
import Link from 'next/link'

export default function QuotesPage() {
  const quotes = [
    {
      id: 'Q-1001',
      client_name: 'Juan Pérez',
      status: 'PENDING',
    },
    {
      id: 'Q-1002',
      client_name: 'María López',
      status: 'PENDING',
    },
  ]

  return (
    <div>
      <h1>Cotizaciones</h1>

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
            <strong>{quote.id}</strong><br />
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
