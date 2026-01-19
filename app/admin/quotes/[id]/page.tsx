import { redirect } from 'next/navigation'
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

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('rank')

  // Some DBs don't have a `status` column. In that case, having a folio/quote_number
  // is the best signal that the quote was "sent"/final.
  const isSent = quote?.status === 'SENT' || !!quote?.quote_number || !!quote?.quote_no
  const includedItems = (items ?? []).filter((i) => i.included)
  const hasSelectedItem = includedItems.length > 0

  // Vehicle label fallback:
  // 1) quotes.vehicle_make/model/year
  // 2) quotes.vehicle_text
  // 3) first quote_line vehicle_make/model/year
  const headerVehicle = [quote?.vehicle_make, quote?.vehicle_model, quote?.vehicle_year]
    .filter(Boolean)
    .join(' ')
  const firstWithVehicle = (lines ?? []).find(
    (l) => (l as any).vehicle_make || (l as any).vehicle_model || (l as any).vehicle_year
  ) as any
  const firstLineVehicle = [firstWithVehicle?.vehicle_make, firstWithVehicle?.vehicle_model, firstWithVehicle?.vehicle_year]
    .filter(Boolean)
    .join(' ')
  const vehicleLabel = headerVehicle || (quote?.vehicle_text ? String(quote.vehicle_text) : '') || firstLineVehicle || '—'

  // vehicleLabel already computed above

  async function saveSelection(formData: FormData) {
    'use server'
    if (!isSent) return
    const selected = formData.get('selected_item') as string | null
    if (!selected) return
    await selectQuoteItem(id, selected)
    redirect(`/admin/quotes/${id}`)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>Cotización #{quote?.quote_number ?? quote?.quote_no ?? id}</h1>

      <div style={{ color: '#666', marginTop: -6, marginBottom: 14 }}>
        Cliente: <b>{quote?.customer_email ?? '—'}</b> &nbsp;|&nbsp; Vehículo: {[
          vehicleLabel,
        ].filter(Boolean).join(' ') || '—'}
      </div>

      <form action={saveSelection}>
        {includedItems.length === 0 && (
          <div style={{ padding: 12, background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
            No hay opciones <b>incluidas</b> guardadas para esta cotización.
          </div>
        )}

        {includedItems.map(item => (
          <label
            key={item.quote_item_id}
            style={{
              display: 'block',
              marginBottom: 12,
              opacity: 1,
            }}
          >
            <input
              type="radio"
              name="selected_item"
              value={item.quote_item_id}
              defaultChecked={item.included === true}
              disabled={!isSent}
            />
            {item.brand} {item.model} — ${
              Number(
                item.total_with_services ?? item.total ?? item.total_tires ?? item.price_each ?? 0
              ).toFixed(2)
            }
          </label>
        ))}

        {isSent && (
          <button type="submit" style={{ marginTop: 16 }}>
            Guardar selección
          </button>
        )}
      </form>

      {isSent && hasSelectedItem && (
        <form action={`/admin/quotes/${id}/approve`} method="post">
          <button style={{ marginTop: 24 }}>
            Aprobar cotización
          </button>
        </form>
      )}
    </div>
  )
}