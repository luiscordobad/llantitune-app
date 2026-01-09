
import Link from 'next/link'
import { getQuoteById } from '@/lib/quotes/getQuoteById'
import { updateQuoteStatus } from '@/lib/quotes/updateQuoteStatus'

export default async function QuoteDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const quote = await getQuoteById(id)

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/quotes">← Volver a cotizaciones</Link>

      <h1 style={{ fontSize: 24, fontWeight: 600, marginTop: 16 }}>
        Cotización #{quote.quote_no ?? '—'}
      </h1>

      <div style={{ marginTop: 24 }}>
        <p><strong>Cliente:</strong> {quote.customer_name ?? '—'}</p>
        <p><strong>Teléfono:</strong> {quote.customer_phone ?? '—'}</p>
        <p><strong>Vehículo:</strong> {quote.vehicle_text ?? '—'}</p>
        <p><strong>Medida:</strong> {quote.size ?? '—'}</p>
        <p><strong>Cantidad:</strong> {quote.quantity ?? '—'}</p>
        <p><strong>Status:</strong> {quote.status}</p>
      </div>

      {quote.status === 'DRAFT' && (
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <form action={updateQuoteStatus.bind(null, quote.quote_id, 'APPROVED')}>
            <button
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#2563eb',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Aprobar
            </button>
          </form>

          <form action={updateQuoteStatus.bind(null, quote.quote_id, 'CANCELLED')}>
            <button
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #ef4444',
                background: '#fff',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
