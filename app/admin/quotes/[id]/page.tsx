import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ id: string }>
}

type QuoteRow = {
  quote_id: string
  quote_number: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  vehicle_text: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  status: string | null
}

type QuoteLineRow = {
  line_id: string
  quote_id: string | null
  line_no: number
  size: string
  quantity: number
  selected_quote_item_id: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
}

type QuoteItemRow = {
  quote_item_id: string
  quote_id: string | null
  quote_line_id: string | null
  line_id: string | null
  included: boolean | null
  provider: string | null
  sku: string | null
  brand: string | null
  model: string | null
  load_speed: string | null
  size: string | null
  stock: number | null
  cost: number | null
  price_each: number | null
  total_tires: number | null
  total_with_services: number | null
}

function fmtMoney(v: any) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'MXN' })
}

function lineVehicleText(ln: QuoteLineRow): string | null {
  const t = [ln.vehicle_make, ln.vehicle_model, ln.vehicle_year]
    .filter(Boolean)
    .join(' ')
  return t || null
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Save selection (one quote_item_id per quote_lines.line_id)
  async function saveSelection(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const selections: Array<{ lineId: string; quoteItemId: string }> = []
    for (const [key, val] of formData.entries()) {
      if (!key.startsWith('selected_')) continue
      const lineId = key.replace('selected_', '')
      const quoteItemId = String(val || '').trim()
      if (lineId && quoteItemId) selections.push({ lineId, quoteItemId })
    }

    if (selections.length === 0) return

    for (const s of selections) {
      // 1) Set selected_quote_item_id on the line
      const { error: lineErr } = await supabase
        .from('quote_lines')
        .update({ selected_quote_item_id: s.quoteItemId })
        .eq('line_id', s.lineId)
        .eq('quote_id', id)
      if (lineErr) throw new Error(lineErr.message)

      // 2) Ensure only the selected option is "included" for this line
      //    (Some data uses quote_items.quote_line_id, some uses quote_items.line_id)
      const lineScope = `quote_line_id.eq.${s.lineId},line_id.eq.${s.lineId}`

      const { error: clearErr } = await supabase
        .from('quote_items')
        .update({ included: false })
        .eq('quote_id', id)
        .or(lineScope)
      if (clearErr) throw new Error(clearErr.message)

      const { error: pickErr } = await supabase
        .from('quote_items')
        .update({ included: true })
        .eq('quote_item_id', s.quoteItemId)
        .eq('quote_id', id)
      if (pickErr) throw new Error(pickErr.message)
    }

    redirect(`/admin/quotes/${id}`)
  }

  // Approve (creates a work order) based on selected items per line
  async function approveSelected(formData: FormData) {
    'use server'
    const supabase = await createClient()

    // Pull lines first
    const { data: lines, error: linesErr } = await supabase
      .from('quote_lines')
      .select('line_id, line_no, size, quantity, selected_quote_item_id, vehicle_make, vehicle_model, vehicle_year')
      .eq('quote_id', id)
      .order('line_no', { ascending: true })

    if (linesErr) throw new Error(linesErr.message)

    const safeLines: QuoteLineRow[] = (lines as any) ?? []

    // If user changed selection on this page but didn't click "Guardar", we still accept the submitted radios.
    // We merge selections from formData into the line rows.
    const selectionMap = new Map<string, string>()
    for (const [key, val] of formData.entries()) {
      if (!key.startsWith('selected_')) continue
      const lineId = key.replace('selected_', '')
      const quoteItemId = String(val || '').trim()
      if (lineId && quoteItemId) selectionMap.set(lineId, quoteItemId)
    }

    const selectedIds: string[] = []
    for (const ln of safeLines) {
      const picked = selectionMap.get(ln.line_id) ?? ln.selected_quote_item_id
      if (!picked) {
        throw new Error(`Missing selection for line ${ln.line_no}`)
      }
      selectedIds.push(picked)

      // Persist selection & included flags (same logic as saveSelection)
      const { error: lineErr } = await supabase
        .from('quote_lines')
        .update({ selected_quote_item_id: picked })
        .eq('line_id', ln.line_id)
        .eq('quote_id', id)
      if (lineErr) throw new Error(lineErr.message)

      const lineScope = `quote_line_id.eq.${ln.line_id},line_id.eq.${ln.line_id}`
      const { error: clearErr } = await supabase
        .from('quote_items')
        .update({ included: false })
        .eq('quote_id', id)
        .or(lineScope)
      if (clearErr) throw new Error(clearErr.message)

      const { error: pickErr } = await supabase
        .from('quote_items')
        .update({ included: true })
        .eq('quote_item_id', picked)
        .eq('quote_id', id)
      if (pickErr) throw new Error(pickErr.message)
    }

    // Fetch the selected quote_items
    const { data: items, error: itemsErr } = await supabase
      .from('quote_items')
      .select(
        'quote_item_id, quote_id, quote_line_id, line_id, provider, sku, brand, model, load_speed, size, stock, cost, price_each, total_tires, total_with_services'
      )
      .in('quote_item_id', selectedIds)
      .eq('quote_id', id)

    if (itemsErr) throw new Error(itemsErr.message)

    const itemById = new Map<string, QuoteItemRow>()
    for (const it of (items as any[]) ?? []) itemById.set(it.quote_item_id, it as any)

    // Create the work order
    const { data: orderInsert, error: orderErr } = await supabase
      .from('orders')
      .insert({ quote_id: id, status: 'DRAFT' })
      .select('order_id')
      .single()

    if (orderErr) throw new Error(orderErr.message)

    const orderId = (orderInsert as any).order_id as string

    // Create order items
    const orderItemsPayload = safeLines.map((ln) => {
      const picked = selectionMap.get(ln.line_id) ?? ln.selected_quote_item_id
      const it = picked ? itemById.get(picked) : undefined

      const qty = Number(ln.quantity ?? 1) || 1
      const priceEach = Number(it?.price_each ?? 0)
      const total =
        Number(it?.total_with_services ?? NaN) ||
        Number(it?.total_tires ?? NaN) ||
        qty * priceEach

      return {
        order_id: orderId,
        line_id: ln.line_id,
        quote_item_id: picked,
        provider: it?.provider ?? null,
        sku: it?.sku ?? null,
        size: it?.size ?? ln.size ?? null,
        brand: it?.brand ?? null,
        model: it?.model ?? null,
        load_speed: it?.load_speed ?? null,
        qty,
        stock: it?.stock ?? null,
        cost_each: it?.cost ?? null,
        price_each: it?.price_each ?? null,
        total,
      }
    })

    const { error: oiErr } = await supabase.from('order_items').insert(orderItemsPayload as any)
    if (oiErr) throw new Error(oiErr.message)

    // Mark quote as approved
    const { error: qErr } = await supabase
      .from('quotes')
      .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
      .eq('quote_id', id)
    if (qErr) throw new Error(qErr.message)

    redirect(`/admin/work-orders/${orderId}`)
  }

  // ---------------- Data loading for UI ----------------
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .select(
      'quote_id, quote_number, customer_name, customer_email, customer_phone, vehicle_text, vehicle_make, vehicle_model, vehicle_year, status'
    )
    .eq('quote_id', id)
    .single()

  if (quoteErr) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Quote not found</h2>
        <p>{quoteErr.message}</p>
        <p>
          <Link href="/admin/quotes">Back to Quotes</Link>
        </p>
      </div>
    )
  }

  const q = quote as any as QuoteRow

  const { data: lines, error: linesErr } = await supabase
    .from('quote_lines')
    .select('line_id, quote_id, line_no, size, quantity, selected_quote_item_id, vehicle_make, vehicle_model, vehicle_year')
    .eq('quote_id', id)
    .order('line_no', { ascending: true })

  if (linesErr) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Error loading quote lines</h2>
        <p>{linesErr.message}</p>
        <p>
          <Link href="/admin/quotes">Back to Quotes</Link>
        </p>
      </div>
    )
  }

  const linesList: QuoteLineRow[] = ((lines as any) ?? []) as any

  const { data: items, error: itemsErr } = await supabase
    .from('quote_items')
    .select(
      'quote_item_id, quote_id, quote_line_id, line_id, included, provider, sku, brand, model, load_speed, size, stock, cost, price_each, total_tires, total_with_services'
    )
    .eq('quote_id', id)

  if (itemsErr) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Error loading quote items</h2>
        <p>{itemsErr.message}</p>
        <p>
          <Link href="/admin/quotes">Back to Quotes</Link>
        </p>
      </div>
    )
  }

  const itemsAll: QuoteItemRow[] = ((items as any) ?? []) as any

  // Group included items by line_id (fallback to quote_line_id / line_id)
  const includedByLine = new Map<string, QuoteItemRow[]>()
  for (const it of itemsAll) {
    if (!it.included) continue
    const lineId = (it.quote_line_id ?? it.line_id ?? '') as string
    if (!lineId) continue
    const arr = includedByLine.get(lineId) ?? []
    arr.push(it)
    includedByLine.set(lineId, arr)
  }

  // ---------------- UI ----------------
  const quoteVehicle =
    q.vehicle_text ||
    [q.vehicle_make, q.vehicle_model, q.vehicle_year].filter(Boolean).join(' ') ||
    '—'

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      {/* Single form so radio selections are available to both actions.
          - Default submit => saveSelection
          - Create Work Order button => approveSelected (via formAction)
      */}
      <form action={saveSelection}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Cotización #{q.quote_number ?? q.quote_id}</h1>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            Cliente: <b>{q.customer_name ?? '—'}</b> | Email: <b>{q.customer_email ?? '—'}</b> | Vehículo:{' '}
            <b>{quoteVehicle}</b> | Estatus: <b>{q.status ?? '—'}</b>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            href="/admin/quotes"
            style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, textDecoration: 'none' }}
          >
            ← Back
          </Link>
          <button
            type="submit"
            formAction={approveSelected}
            style={{ padding: '6px 10px', border: '1px solid #10b981', borderRadius: 6, background: '#10b981', color: 'white' }}
          >
            Create Work Order
          </button>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: 14,
          background: 'white',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Included options</h2>
          <div style={{ color: '#6b7280', fontSize: 12 }}>Pick 1 option per line. Then click “Create Work Order”.</div>
        </div>

        <div style={{ height: 12 }} />

        {linesList.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No lines found for this quote.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {linesList.map((ln) => {
                const lineId = ln.line_id
                const lineTitle = `Line ${ln.line_no}: ${ln.size} x${ln.quantity}`
                const vehicle = lineVehicleText(ln)
                const opts = includedByLine.get(lineId) ?? []
                const selected = ln.selected_quote_item_id ?? (opts[0]?.quote_item_id ?? null)

                return (
                  <div key={lineId} style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{lineTitle}</div>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>{vehicle ? vehicle : '—'}</div>
                      </div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Line ID: {lineId.slice(0, 8)}…</div>
                    </div>

                    <div style={{ height: 10 }} />

                    {opts.length === 0 ? (
                      <div style={{ color: '#ef4444', fontSize: 13 }}>
                        No included options found for this line. (Check quote_items.included)
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {opts.map((it) => {
                          const label = `${it.brand ?? ''} ${it.model ?? ''} ${it.load_speed ?? ''}`.trim() || 'Option'
                          const right = it.total_with_services ?? it.total_tires ?? (Number(it.price_each ?? 0) * Number(ln.quantity ?? 1))

                          return (
                            <label
                              key={it.quote_item_id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 10,
                                padding: '8px 10px',
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <input
                                  type="radio"
                                  name={`selected_${lineId}`}
                                  value={it.quote_item_id}
                                  defaultChecked={selected === it.quote_item_id}
                                />
                                <div>
                                  <div style={{ fontWeight: 600 }}>{label}</div>
                                  <div style={{ color: '#6b7280', fontSize: 12 }}>
                                    Provider: {it.provider ?? '—'} | SKU: {it.sku ?? '—'} | Stock: {it.stock ?? '—'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ fontWeight: 700 }}>{fmtMoney(right)}</div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ height: 12 }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="submit"
                style={{ padding: '8px 12px', border: '1px solid #111827', borderRadius: 8, background: 'white' }}
              >
                Guardar selección
              </button>
            </div>
	          </div>
        )}
      </div>

      <div style={{ height: 16 }} />

      <div style={{ color: '#6b7280', fontSize: 12 }}>
        Tip: If the customer picks “ZMAX”, select that option on its line and click “Create Work Order”. This will set
        quote_lines.selected_quote_item_id, mark only that option as included, and insert a new record in orders +
        order_items.
      </div>

      </form>
    </div>
  )
}
