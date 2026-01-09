
import Link from 'next/link'
import { getQuoteById } from '@/lib/quotes/getQuoteById'
import { getQuoteItemsByQuoteId } from '@/lib/quotes/getQuoteItemsByQuoteId'
import { selectQuoteItem } from '@/lib/quotes/selectQuoteItem'
import { sendQuote } from '@/lib/quotes/sendQuote'

export default async function QuoteDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const quote = await getQuoteById(id)
  const items = await getQuoteItemsByQuoteId(id)

  const isDraft = quote.status === 'DRAFT'

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/quotes">← Volver a cotizaciones</Link>

      <h1 style={{ fontSize: 24, fontWeight: 600, marginTop: 16 }}>
        Cotización #{quote.quote_no ?? '—'}
      </h1>

      <div style={{ marginTop: 24 }}>
        <p><strong>Cliente:</strong> {quote.customer_name ?? '—'}</p>
        <p><strong>Vehículo:</strong> {quote.vehicle_text ?? '—'}</p>
        <p><strong>Medida:</strong> {quote.size ?? '—'} × {quote.quantity ?? '—'}</p>
        <p><strong>Status:</strong> {quote.status}</p>
      </div>

      <h2 style={{ marginTop: 32 }}>Seleccionar llanta</h2>

      {items.length === 0 && (
        <p style={{ opacity: 0.6 }}>No hay opciones disponibles.</p>
      )}

      <form>
        {items.map(item => (
          <label
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 0',
              borderBottom: '1px solid #e5e7eb',
              opacity: isDraft ? 1 : 0.6,
            }}
          >
            <input
              type="radio"
              name="quoteItem"
              value={item.id}
              defaultChecked={quote.selected_quote_item_id === item.id}
              disabled={!isDraft}
              formAction={
                isDraft
                  ? selectQuoteItem.bind(null, id, item.id)
                  : undefined
              }
            />
            <div>
              <strong>{item.brand} {item.model}</strong><br />
              <small>
                ${item.price ?? '—'} · Stock: {item.stock ?? '—'}
              </small>
            </div>
          </label>
        ))}
      </form>

      {isDraft && (
        <form action={sendQuote.bind(null, quote.quote_id)} style={{ marginTop: 24 }}>
          <button
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#16a34a',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Enviar cotización
          </button>
        </form>
      )}
    </div>
  )
}
