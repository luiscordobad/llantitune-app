import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import QuoteDetailClient from './quote-detail-client'

export const dynamic = 'force-dynamic'

type QuoteRow = {
  quote_id: string
  quote_number: string | null
  customer_name: string | null
  customer_email: string | null
  vehicle_text: string | null
  status: string | null
}

type QuoteLineRow = {
  line_id: string
  quote_id: string | null
  line_no: number
  size: string
  quantity: number
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  selected_quote_item_id: string | null
}

type QuoteItemRow = {
  quote_item_id: string
  quote_id: string | null
  line_id: string | null
  quote_line_id: string | null
  provider: string | null
  sku: string | null
  stock: number | null
  cost: number | null
  price_each: number | null
  total_tires: number | null
  total_with_services: number | null
  brand: string | null
  model: string | null
  load_speed: string | null
  size: string | null
  included: boolean | null
  rank: number | null
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Quote header
  const { data: quoteData, error: quoteErr } = await supabaseAdmin
    .from('quotes')
    .select('quote_id, quote_number, customer_name, customer_email, vehicle_text, status')
    .eq('quote_id', id)
    .maybeSingle()

  if (quoteErr) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/quotes">← Back</Link>
        <div style={{ marginTop: 12, color: '#b91c1c' }}>Error loading quote: {quoteErr.message}</div>
      </div>
    )
  }

  const quote = (quoteData as QuoteRow | null)

  // Guard: if the quote doesn't exist, do not render the client component (fixes TS error).
  if (!quote) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/quotes">← Back</Link>
        <div style={{ marginTop: 12 }}>Quote not found.</div>
      </div>
    )
  }

  // Lines
  const { data: linesData, error: linesErr } = await supabaseAdmin
    .from('quote_lines')
    .select(
      'line_id, quote_id, line_no, size, quantity, vehicle_make, vehicle_model, vehicle_year, selected_quote_item_id'
    )
    .eq('quote_id', id)
    .order('line_no', { ascending: true })

  if (linesErr) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/quotes">← Back</Link>
        <div style={{ marginTop: 12, color: '#b91c1c' }}>Error loading quote lines: {linesErr.message}</div>
      </div>
    )
  }

  const lines = (linesData ?? []) as QuoteLineRow[]

  // Items (options)
  const { data: itemsData, error: itemsErr } = await supabaseAdmin
    .from('quote_items')
    .select(
      'quote_item_id, quote_id, line_id, quote_line_id, provider, sku, stock, cost, price_each, total_tires, total_with_services, brand, model, load_speed, size, included, rank'
    )
    .eq('quote_id', id)
    .order('rank', { ascending: true })

  if (itemsErr) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/quotes">← Back</Link>
        <div style={{ marginTop: 12, color: '#b91c1c' }}>Error loading quote items: {itemsErr.message}</div>
      </div>
    )
  }

  const items = (itemsData ?? []) as QuoteItemRow[]

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <QuoteDetailClient quote={quote} lines={lines} items={items} />
    </div>
  )
}
