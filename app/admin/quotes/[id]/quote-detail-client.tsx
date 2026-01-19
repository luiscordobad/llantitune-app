'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type AnyRow = Record<string, any>

function money(n: any) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export default function QuoteDetailClient({
  quote,
  lines,
  items,
}: {
  quote: AnyRow
  lines: AnyRow[]
  items: AnyRow[]
}) {
  const router = useRouter()

  const linesWithIncluded = useMemo(() => {
    const byLine: Record<string, AnyRow[]> = {}
    for (const it of items) {
      if (!it?.line_id) continue
      if (it.included !== true) continue
      byLine[it.line_id] = byLine[it.line_id] || []
      byLine[it.line_id].push(it)
    }
    return lines
      .map((ln) => ({ ln, includedItems: byLine[ln.line_id] || [] }))
      .filter((x) => x.includedItems.length > 0)
  }, [lines, items])

  const initialSelections = useMemo(() => {
    const m: Record<string, string> = {}
    for (const { ln, includedItems } of linesWithIncluded) {
      const pre = ln.selected_quote_item_id as string | null
      if (pre) {
        m[ln.line_id] = pre
        continue
      }
      // fallback: pick first included item
      if (includedItems[0]?.quote_item_id) m[ln.line_id] = includedItems[0].quote_item_id
    }
    return m
  }, [linesWithIncluded])

  const [selected, setSelected] = useState<Record<string, string>>(initialSelections)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const headerVehicle = (quote.vehicle_text || [quote.vehicle_make, quote.vehicle_model, quote.vehicle_year].filter(Boolean).join(' ')) || '—'

  const totalSelected = useMemo(() => {
    let t = 0
    for (const { ln, includedItems } of linesWithIncluded) {
      const sel = selected[ln.line_id]
      const it = includedItems.find((x) => x.quote_item_id === sel)
      if (!it) continue
      t += Number(it.total ?? (Number(it.price_each ?? 0) * Number(it.quoted_qty ?? ln.quantity ?? 0))) || 0
    }
    return t
  }, [linesWithIncluded, selected])

  async function saveSelection() {
    setBusy('save')
    setMsg(null)
    try {
      const selections = Object.entries(selected).map(([lineId, quoteItemId]) => ({ lineId, quoteItemId }))
      const res = await fetch('/api/admin/quotes/save-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.quote_id, selections }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Failed to save selection')
      setMsg('Selección guardada')
      router.refresh()
    } catch (e: any) {
      setMsg(e?.message || 'Error')
    } finally {
      setBusy(null)
    }
  }

  async function createWorkOrder() {
    setBusy('work')
    setMsg(null)
    try {
      // ensure every line has a selection
      for (const { ln } of linesWithIncluded) {
        if (!selected[ln.line_id]) throw new Error('Selecciona 1 opción por cada línea')
      }

      await saveSelection()

      const res = await fetch('/api/admin/quotes/create-work-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.quote_id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Failed to create work order')

      if (j?.workOrderId) {
        router.push(`/admin/work-orders/${j.workOrderId}`)
      } else {
        router.push('/admin/work-orders')
      }
    } catch (e: any) {
      setMsg(e?.message || 'Error')
    } finally {
      setBusy(null)
    }
  }

  if (linesWithIncluded.length === 0) {
    return (
      <div style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Included options</div>
        <div style={{ fontSize: 12, color: '#666' }}>No included items found for this quote.</div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 10 }}>
        Cliente: <b>{quote.customer_name || '—'}</b> | Email: <b>{quote.customer_email || '—'}</b> | Vehículo: <b>{headerVehicle}</b>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>Included options</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Pick 1 option per line.</div>
          <button
            onClick={createWorkOrder}
            disabled={busy !== null}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #0a0',
              background: '#19a34a',
              color: 'white',
              fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy === 'work' ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {linesWithIncluded.map(({ ln, includedItems }) => {
          const lineTitle = `Line ${ln.line_no ?? ''}: ${ln.size ?? '—'} x${ln.quantity ?? '—'}`
          const lineVehicle =
            (ln.vehicle_text || [ln.vehicle_make, ln.vehicle_model, ln.vehicle_year].filter(Boolean).join(' ')) || headerVehicle

          return (
            <div key={ln.line_id} style={{ border: '1px solid #eee', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{lineTitle}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{lineVehicle || '—'}</div>
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>Line ID: {String(ln.line_id).slice(0, 8)}...</div>
              </div>

              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {includedItems.map((it) => {
                  const checked = selected[ln.line_id] === it.quote_item_id
                  const price = money(it.total ?? it.price_each)
                  const stock = it.stock ?? it.min_stock ?? null

                  return (
                    <label
                      key={it.quote_item_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        border: '1px solid #eee',
                        borderRadius: 12,
                        padding: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <input
                          type="radio"
                          name={`line-${ln.line_id}`}
                          checked={checked}
                          onChange={() => setSelected((s) => ({ ...s, [ln.line_id]: it.quote_item_id }))}
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {it.brand ? `${it.brand} ` : ''}{it.model || it.description || 'Option'}
                          </div>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            Provider: {it.provider || '—'} | SKU: {it.sku || '—'} | Stock: {stock ?? '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>{price}</div>
                    </label>
                  )
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  onClick={saveSelection}
                  disabled={busy !== null}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #ccc',
                    background: 'white',
                    fontWeight: 700,
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busy === 'save' ? 'Saving...' : 'Guardar selección'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 12, color: '#666' }}>
          Tip: If the customer picks a specific option, select it on its line and click “Create Work Order”.
        </div>
        <div style={{ fontWeight: 900 }}>Total: {money(totalSelected)}</div>
      </div>

      {msg ? (
        <div style={{ marginTop: 10, fontSize: 12, color: msg.toLowerCase().includes('error') ? '#b00' : '#166534' }}>{msg}</div>
      ) : null}
    </div>
  )
}
      const selected = ln.selected_quote_item_id
      if (selected) {
        m[ln.line_id] = selected
        continue
      }
      // Default to first included option
      if (includedItems[0]?.quote_item_id) m[ln.line_id] = includedItems[0].quote_item_id
    }
    return m
  }, [linesWithIncluded])

  const [selections, setSelections] = useState<Record<string, string>>(initialSelections)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headerVehicle =
    quote?.vehicle_text ||
    [quote?.vehicle_make, quote?.vehicle_model, quote?.vehicle_year].filter(Boolean).join(' ') ||
    '—'

  const totalSelected = useMemo(() => {
    let sum = 0
    for (const { ln, includedItems } of linesWithIncluded) {
      const selId = selections[ln.line_id]
      const it = includedItems.find((x) => x.quote_item_id === selId)
      if (it) sum += Number(it.total ?? it.price_each ?? 0)
    }
    return sum
  }, [linesWithIncluded, selections])

  async function saveSelection() {
    setError(null)
    setSaving(true)
    try {
      const payload = {
        quoteId: quote.quote_id,
        selections: Object.entries(selections).map(([lineId, quoteItemId]) => ({
          lineId,
          quoteItemId,
        })),
      }

      const res = await fetch('/api/admin/quotes/save-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'Failed to save selection')
      }

      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function createWorkOrder() {
    setError(null)
    setCreating(true)
    try {
      // Ensure selection for all visible lines
      for (const { ln } of linesWithIncluded) {
        if (!selections[ln.line_id]) {
          throw new Error('Pick 1 option per line before creating a work order.')
        }
      }

      // Save selection first
      await saveSelection()

      const res = await fetch('/api/admin/quotes/create-work-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.quote_id }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(j?.error || 'Failed to create work order')
      }

      const workOrderId = j?.workOrderId
      if (workOrderId) {
        router.push(`/admin/work-orders/${workOrderId}`)
      } else {
        router.push('/admin/work-orders')
      }
    } catch (e: any) {
      setError(e?.message || 'Unexpected error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Cotización #{quote?.quote_number ?? quote?.quote_id}</h1>
          <div style={{ marginTop: 8, color: '#4b5563' }}>
            Cliente: <b>{quote?.customer_name || '—'}</b> | Email: <b>{quote?.customer_email || '—'}</b> | Vehículo:{' '}
            <b>{headerVehicle}</b> | Estatus: <b>{quote?.status || '—'}</b>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/admin/quotes" style={{ textDecoration: 'none' }}>
            ← Back
          </Link>
          <button
            onClick={createWorkOrder}
            disabled={creating}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #10b981',
              background: '#10b981',
              color: 'white',
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer',
            }}
          >
            {creating ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Included options</h2>
        <div style={{ color: '#4b5563' }}>Pick 1 option per line. Then click “Create Work Order”.</div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {linesWithIncluded.map(({ ln, includedItems }, idx) => {
          const lineVehicle =
            [ln.vehicle_make, ln.vehicle_model, ln.vehicle_year].filter(Boolean).join(' ') || headerVehicle

          return (
            <div
              key={ln.line_id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 16,
                background: 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    Line {idx + 1}: {ln.size || '—'} x{ln.quantity ?? '—'}
                  </div>
                  <div style={{ color: '#4b5563', marginTop: 4 }}>{lineVehicle || '—'}</div>
                </div>
                <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'right' }}>
                  Line ID: {String(ln.line_id).slice(0, 8)}...
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {includedItems.map((it: AnyRow) => {
                  const checked = selections[ln.line_id] === it.quote_item_id
                  return (
                    <label
                      key={it.quote_item_id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        border: checked ? '2px solid #2563eb' : '1px solid #e5e7eb',
                        background: checked ? 'rgba(37, 99, 235, 0.06)' : 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          type="radio"
                          name={`line-${ln.line_id}`}
                          checked={checked}
                          onChange={() =>
                            setSelections((p) => ({
                              ...p,
                              [ln.line_id]: it.quote_item_id,
                            }))
                          }
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {it.brand || ''} {it.size || ''} {it.model || ''}
                          </div>
                          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                            Provider: {it.provider ?? '—'} | SKU: {it.sku ?? '—'} | Stock: {it.stock ?? '—'}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap' }}>{money(it.total)}</div>
                    </label>
                  )
                })}
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={saveSelection}
                  disabled={saving}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #111827',
                    background: 'white',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Guardar selección'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', fontWeight: 800 }}>
        Total: {money(totalSelected)}
      </div>

      {error ? (
        <div style={{ marginTop: 12, color: '#b91c1c' }}>
          <b>Error:</b> {error}
        </div>
      ) : null}

      <div style={{ marginTop: 10, color: '#6b7280', fontSize: 13 }}>
        Tip: If the customer picks “ZMAX”, select that option on its line and click “Create Work Order”. This will set
        quote_lines.selected_quote_item_id, mark only that option as included, and create a work order.
      </div>
    </div>
  )
}
