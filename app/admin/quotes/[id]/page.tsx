
import { redirect } from 'next/navigation'
import { getQuoteById } from '@/lib/quotes/getQuoteById'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function QuoteManagePage({ params }: PageProps) {
  const { id: quoteId } = await params
  const quote = await getQuoteById(quoteId)

  async function approveQuote() {
    'use server'
    redirect('/admin/quotes')
  }

  async function cancelQuote() {
    'use server'
    redirect('/admin/quotes')
  }

  return (
    <div>
      <h1>Gestionar cotización</h1>

      <p><strong>Folio:</strong> {quote.folio}</p>
      <p><strong>Cliente:</strong> {quote.client_name}</p>
      <p><strong>Status:</strong> {quote.status}</p>

      <hr />

      {quote.quote_lines.map((line: any) => (
        <div key={line.id} style={{ marginTop: 24 }}>
          <h3>{line.size}</h3>

          {line.quote_items
            .filter((item: any) => item.included)
            .map((item: any) => (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <strong>{item.brand} {item.model}</strong><br />
                ${item.price} — Stock: {item.stock}
              </div>
            ))}
        </div>
      ))}

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <form action={cancelQuote}>
          <button type="submit">Cancelar</button>
        </form>

        <form action={approveQuote}>
          <button type="submit">Aprobar</button>
        </form>
      </div>
    </div>
  )
}
