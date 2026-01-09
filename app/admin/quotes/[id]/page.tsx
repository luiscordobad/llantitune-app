
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { selectQuoteItem } from '@/lib/quotes/selectQuoteItem'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', id)
    .single()

  if (!quote) notFound()

  const isSent = quote.status === 'SENT'
  const isApproved = quote.status === 'APPROVED'
  const isCancelled = quote.status === 'CANCELLED'

  const { data: rawItems } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .eq('included', true)
    .order('rank')

  const items = rawItems ?? []

  async function handleSelect(formData: FormData) {
    'use server'
    const selected = formData.get('selected_item') as string | null
    if (!selected) return
    await selectQuoteItem(id, selected)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <a href="/admin/quotes" style={{ fontSize: 14, color: '#666' }}>
        ← Volver a cotizaciones
      </a>

      <h1 style={{ fontSize: 26, marginTop: 16 }}>
        Cotización #{quote.quote_no ?? '—'}
      </h1>

      <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
        <p><strong>Status:</strong> {quote.status}</p>
        {quote.sent_at && (
          <p>
            <strong>Enviada:</strong>{' '}
            {new Date(quote.sent_at).toLocaleString()}
          </p>
        )}
        <p><strong>Cliente:</strong> {quote.customer_name ?? '—'}</p>
        <p><strong>Teléfono:</strong> {quote.customer_phone ?? '—'}</p>
        <p>
          <strong>Vehículo:</strong>{' '}
          {[
            quote.vehicle_make,
            quote.vehicle_model,
            quote.vehicle_year,
          ].filter(Boolean).join(' ') || '—'}
        </p>
        <p><strong>Medida:</strong> {quote.size ?? '—'}</p>
        <p><strong>Cantidad:</strong> {quote.quantity ?? '—'}</p>
      </div>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>
        Opciones cotizadas
      </h2>

      {items.length === 0 ? (
        <p style={{ marginTop: 12, color: '#777' }}>
          No hay opciones disponibles.
        </p>
      ) : (
        <form action={handleSelect} style={{ marginTop: 16 }}>
          {items.map(item => (
            <label
              key={item.quote_item_id}
              style={{
                display: 'block',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 14,
                marginBottom: 12,
                cursor: isSent ? 'pointer' : 'default',
                opacity: isSent ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="radio"
                  name="selected_item"
                  value={item.quote_item_id}
                  defaultChecked={
                    quote.selected_quote_item_id === item.quote_item_id
                  }
                  disabled={!isSent}
                />

                <div>
                  <div style={{ fontWeight: 600 }}>
                    {item.brand} – {item.model}
                  </div>
                  <div style={{ fontSize: 13, color: '#555' }}>
                    {item.size} · {item.load_speed} · Stock {item.stock}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    Total:{' '}
                    <strong>
                      ${Number(item.total_with_services).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            </label>
          ))}

          {isSent && (
            <button
              type="submit"
              style={{
                marginTop: 16,
                padding: '10px 18px',
                borderRadius: 6,
                border: 'none',
                background: '#111',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Guardar selección
            </button>
          )}
        </form>
      )}

      {(isApproved || isCancelled) && (
        <p style={{ marginTop: 24, color: '#666' }}>
          Esta cotización ya no se puede modificar.
        </p>
      )}
    </div>
  )
}
