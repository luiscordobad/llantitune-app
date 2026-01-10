
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

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('quote_id, status')
    .eq('quote_id', quote_id)
    .single()

  if (error || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  const { data: lines } = await supabase
    .from('quote_lines')
    .select('selected_quote_item_id')
    .eq('quote_id', quote_id)

  const selected = lines?.find(l => l.selected_quote_item_id)

  if (!selected) {
    return NextResponse.json(
      { error: 'No selected quote item' },
      { status: 400 }
    )
  }

  await supabase
    .from('quotes')
    .update({
      status: 'APPROVED',
      approved_at: new Date().toISOString()
    })
    .eq('quote_id', quote_id)

  await supabase.from('orders').insert({
    quote_id,
    status: 'OPEN'
  })

  return NextResponse.json({ ok: true })
}
