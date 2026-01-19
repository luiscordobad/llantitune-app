'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QuoteManageModal from '@/app/components/quotes/QuoteManageModal'

type AnyRow = any

type Props = {
  // allow multiple prop names to be compatible with older/newer server page.tsx
  rows?: AnyRow[]
  quotes?: AnyRow[]
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
}

function fmtVehicle(q: AnyRow) {
  // Prefer the denormalized text stored on the quote header (filled by /api/admin/quote/status)
  // because quote_lines may not store vehicle_* for newer drafts.
  const vehicleText = q.vehicle_text ?? q.vehicleText ?? null
  if (typeof vehicleText === 'string' && vehicleText.trim()) return vehicleText.trim()

  const parts = [q.vehicle_make, q.vehicle_model, q.vehicle_year].filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

export default function QuotesTableClient(props: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  const quotes = (props.rows ?? props.quotes ?? []) as AnyRow[]
  const page = Number(props.page ?? sp.get('page') ?? '1') || 1
  const pageSize = Number(props.pageSize ?? sp.get('pageSize') ?? '20') || 20
  const total = typeof props.total === 'number' ? props.total : quotes.length
  const totalPages =
    typeof props.totalPages === 'number'
      ? props.totalPages
      : Math.max(1, Math.ceil((total || 0) / (pageSize || 1)))

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  const canPrev = page > 1
  const canNext = page < totalPages

  const pageLabel = useMemo(() => {
    if (!total) return `Página ${page}`
    return `Página ${page} de ${totalPages} · ${total} registro(s)`
  }, [page, totalPages, total])

  function goTo(p: number) {
    const params = new URLSearchParams(sp.toString())
    params.set('page', String(Math.max(1, Math.min(totalPages, p))))
    params.set('pageSize', String(pageSize))
    router.push(`/admin/quotes?${params.toString()}`)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ color: '#666' }}>{pageLabel}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" disabled={!canPrev} onClick={() => goTo(page - 1)}>
            Anterior
          </button>
          <button className="btn" disabled={!canNext} onClick={() => goTo(page + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Folio</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Cliente</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>Vehículo</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 10 }}>Min stock</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 10 }}>ID</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #eee', padding: 10 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q: AnyRow) => (
              <tr key={q.quote_id ?? q.id ?? q.quoteId ?? q.quote_id}>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>
                  <b>{q.quote_number ?? q.quoteNumber ?? '—'}</b>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>
                  {q.customer_name ?? q.customerName ?? q.customer_email ?? q.customerEmail ?? '—'}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>{fmtVehicle(q)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}>{q.min_stock ?? q.minStock ?? '—'}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2', color: '#666' }}>
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 }}>
                    {q.quote_id ?? q.id ?? '—'}
                  </span>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}>
                  <button className="btn btnPrimary" onClick={() => setSelectedQuoteId(String(q.quote_id ?? q.id))}>
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
            {!quotes.length && (
              <tr>
                <td colSpan={6} style={{ padding: 14, color: '#666' }}>
                  No hay cotizaciones para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedQuoteId && (
        <QuoteManageModal
          quoteId={selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
        />
      )}
    </>
  )
}
