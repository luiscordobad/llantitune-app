import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { selectQuoteItem } from '@/lib/quotes/selectQuoteItem'
import QuoteStatusActions from './quote-status-actions'

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

  const linesList = (lines ?? []) as any[]
  const itemsList = (items ?? []) as any[]

  const includedItemsByLine = linesList.map((ln) => {
    const lineId = ln?.line_id
    const lineItems = itemsList.filter(
      (it) =>
        it?.included &&
        (it?.quote_line_id === lineId || it?.line_id === lineId)
    )
    return { line: ln, items: lineItems }
  })

  const includedGrandTotal = includedItems.reduce((sum: number, it: any) => {
    const v =
      Number(it?.total_with_services ?? it?.total ?? it?.total_tires ?? 0) || 0
    return sum + v
  }, 0)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 14,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Cotización #{quote?.quote_number ?? quote?.quote_no ?? id}</h1>
          <div style={{ color: '#666', marginTop: 6 }}>
            Cliente: <b>{quote?.customer_name ?? quote?.customer_email ?? '—'}</b>
            &nbsp;|&nbsp; Vehículo: {vehicleText || '—'}
            &nbsp;|&nbsp; Estatus: <b>{quote?.status ?? '—'}</b>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/admin/quotes" style={{ textDecoration: 'none' }}>← Back</Link>
          <QuoteStatusActions quoteId={id} currentStatus={quote?.status ?? null} />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0 }}>Included options</h2>
          <div style={{ color: '#111', fontWeight: 700 }}>
            Total: ${includedGrandTotal.toFixed(2)}
          </div>
        </div>
        <p style={{ color: '#666', marginTop: 6 }}>
          Showing only options marked as <b>included</b>.
        </p>

        {includedItems.length === 0 ? (
          <div style={{ padding: 12, background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
            No hay opciones <b>incluidas</b> guardadas para esta cotización.
          </div>
        ) : linesList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {includedItemsByLine.map(({ ln, items }) => {
              const lineVehicle = [
                (ln as any).vehicle_make,
                (ln as any).vehicle_model,
                (ln as any).vehicle_year,
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div
                  key={ln.line_id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: 12,
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>
                      Line {ln.line_no}: {ln.size} × {ln.quantity}
                    </div>
                    <div style={{ color: '#666' }}>{lineVehicle || vehicleText || '—'}</div>
                  </div>

                  {items.length === 0 ? (
                    <div style={{ marginTop: 8, color: '#666' }}>No included options for this line.</div>
                  ) : (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {items.map((it: any) => {
                        const amount = Number(
                          it.total_with_services ?? it.total ?? it.total_tires ?? it.price_each ?? 0
                        )
                        return (
                          <div key={it.quote_item_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>
                                {it.brand} {it.model}
                              </div>
                              <div style={{ color: '#666', fontSize: 13 }}>
                                {it.provider ? `Provider: ${it.provider}` : 'Provider: —'}
                                {it.sku ? ` • SKU: ${it.sku}` : ''}
                              </div>
                            </div>
                            <div style={{ fontWeight: 700 }}>${amount.toFixed(2)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {includedItems.map((it: any) => {
              const amount = Number(it.total_with_services ?? it.total ?? it.total_tires ?? it.price_each ?? 0)
              return (
                <div
                  key={it.quote_item_id}
                  style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, background: '#fff' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>
                      {it.brand} {it.model}
                    </div>
                    <div style={{ fontWeight: 700 }}>${amount.toFixed(2)}</div>
                  </div>
                  <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                    {it.provider ? `Provider: ${it.provider}` : 'Provider: —'}
                    {it.sku ? ` • SKU: ${it.sku}` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}