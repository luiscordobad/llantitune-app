
import Link from 'next/link'
import { getQuoteById } from '@/lib/quotes/getQuoteById'

export default async function QuoteDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const quote = await getQuoteById(id)

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/quotes">
        ← Volver a cotizaciones
      </Link>

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
    </div>
  )
}
