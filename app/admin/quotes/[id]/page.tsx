
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markQuoteSent } from '@/lib/quotes/markQuoteSent'

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

  const isDraft = quote.status === 'DRAFT'

  const { data: rawItems } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .eq('included', true)
    .order('rank')

  const items = rawItems ?? []

  async function saveSelection(formData: FormData) {
    'use server'
    if (!isDraft) return

    const selectedId = formData.get('selected_item') as string | null
    if (!selectedId) return

    const supabase = await createClient()
    await supabase
      .from('quotes')
      .update({ selected_quote_item_id: selectedId })
      .eq('quote_id', id)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <a href="/admin/quotes" style={{ fontSize: 14, color: '#666' }}>
        ← Volver a cotizaciones
      </a>

      <h1 style={{ fontSize: 24, marginTop: 16 }}>
        Cotización #{quote.quote_no ?? '—'}
      </h1>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        <p><strong>Cliente:</strong> {quote.customer_name ?? '—'}</p>
        <p><strong>Status:</strong> {quote.status}</p>
      </div>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>
        Opciones cotizadas
      </h2>

      {items.length === 0 ? (
        <p style={{ marginTop: 12, color: '#777' }}>
          No hay opciones disponibles.
        </p>
      ) : (
        <form action={saveSelection} style={{ marginTop: 16 }}>
          {items.map(item => (
            <label
              key={item.quote_item_id}
              style={{
                display: 'block',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                padding: 12,
                marginBottom: 12,
                cursor: isDraft ? 'pointer' : 'default',
                opacity: isDraft ? 1 : 0.6,
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
                  disabled={!isDraft}
                />

                <div>
                  <div style={{ fontWeight: 600 }}>
                    {item.brand} – {item.model}
                  </div>
                  <div style={{ fontSize: 13, color: '#555' }}>
                    {item.size} · {item.load_speed}
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

          {isDraft && (
            <button
              type="submit"
              style={{
                marginTop: 16,
                padding: '10px 16px',
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

      {isDraft && (
        <form action={markQuoteSent.bind(null, quote.quote_id)}>
          <button
            style={{
              marginTop: 24,
              padding: '10px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#2563eb',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Marcar como enviada
          </button>
        </form>
      )}
    </div>
  )
}
