import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import QuoteDetailClient from './quote-detail-client'

export const dynamic = 'force-dynamic'

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: quote } = await supabaseAdmin
    .from('quotes')
    .select('*')
    .eq('quote_id', id)
    .maybeSingle()

  if (!quote) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Quote not found</h1>
        <Link href="/admin/quotes">Back</Link>
      </div>
    )
  }

  const { data: lines } = await supabaseAdmin
    .from('quote_lines')
    .select('*')
    .eq('quote_id', id)
    .order('line_no', { ascending: true })

  const { data: items } = await supabaseAdmin
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('line_id', { ascending: true })
    .order('sort_order', { ascending: true })

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/admin/quotes" style={{ textDecoration: 'none' }}>
            ← Back
          </Link>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{quote.quote_number ? `Cotización #${quote.quote_number}` : 'Cotización'}</div>
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>Status: {quote.status ?? '—'}</div>
      </div>

      <QuoteDetailClient quote={quote} lines={lines ?? []} items={items ?? []} />
    </div>
  )
}
