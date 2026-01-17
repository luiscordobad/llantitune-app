
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { quote_id } = await req.json()

  if (!quote_id) {
    return NextResponse.json({ error: 'quote_id is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Schema-tolerant helpers (some deployments don't have `status`, `approved_at`, `orders`, etc.)
  async function safeUpdate(table: string, payload: Record<string, any>, filter: (q: any) => any) {
    let current = { ...payload }
    let attempts = 0
    while (attempts < 6) {
      const { error } = await filter(supabase.from(table).update(current))
      if (!error) return { ok: true }
      const msg = String((error as any).message ?? '')
      const m = msg.match(/Could not find the '([^']+)' column/)
      if (m?.[1] && m[1] in current) {
        delete current[m[1]]
        attempts++
        continue
      }
      return { ok: false, error }
    }
    return { ok: false, error: new Error('Too many attempts') }
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', quote_id)
    .single()

  if (error || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  // If your schema doesn't have `selected_quote_item_id`, we can't approve.
  const { data: lines, error: linesErr } = await supabase
    .from('quote_lines')
    .select('selected_quote_item_id')
    .eq('quote_id', quote_id)

  if (linesErr) {
    const msg = String((linesErr as any).message ?? '')
    if (msg.includes("selected_quote_item_id")) {
      return NextResponse.json(
        { error: "Your DB is missing quote_lines.selected_quote_item_id, so approval can't be recorded." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: msg || 'Failed to load lines' }, { status: 500 })
  }

  const selected = lines?.find(l => l.selected_quote_item_id)

  if (!selected) {
    return NextResponse.json(
      { error: 'No selected quote item' },
      { status: 400 }
    )
  }

  const upd = await safeUpdate(
    'quotes',
    {
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
    },
    (q) => q.eq('quote_id', quote_id)
  )

  if (!upd.ok) {
    return NextResponse.json(
      { error: (upd as any).error?.message ?? 'Failed to update quote' },
      { status: 500 }
    )
  }

  // Orders table is optional
  const { error: orderErr } = await supabase.from('orders').insert({
    quote_id,
    status: 'OPEN',
  })
  if (orderErr) {
    const msg = String((orderErr as any).message ?? '')
    // ignore missing table/column errors
    if (!(msg.includes('does not exist') || msg.includes('Could not find'))) {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
