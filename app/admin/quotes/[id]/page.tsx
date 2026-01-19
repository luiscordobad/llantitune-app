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

  // Fetch lines to derive vehicle info when header fields are null.
  const { data: lines } = await supabase
    .from('quote_lines')
    .select('line_id,quote_id,line_no,size,quantity,vehicle_make,vehicle_model,vehicle_year')
    .eq('quote_id', id)
    .order('line_no')

  const headerVehicleText =
    (quote as any)?.vehicle_text ??
    [
      (quote as any)?.vehicle_make,
      (quote as any)?.vehicle_model,
      (quote as any)?.vehicle_year,
    ]
      .filter(Boolean)
      .join(' ')

  const firstLineWithVehicle = (lines ?? []).find(
    (l: any) => l?.vehicle_make || l?.vehicle_model || l?.vehicle_year
  ) as any

  const lineVehicleText = [
    firstLineWithVehicle?.vehicle_make,
    firstLineWithVehicle?.vehicle_model,
    firstLineWithVehicle?.vehicle_year,
  ]
    .filter(Boolean)
    .join(' ')

  const vehicleText = (headerVehicleText || lineVehicleText || null) as string | null

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
          vehicleText,
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