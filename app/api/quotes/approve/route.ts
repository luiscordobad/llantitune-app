import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { quote_id, selections } = await req.json()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  for (const sel of selections) {
    await supabase
      .from('quote_lines')
      .update({ selected_quote_item_id: sel.quote_item_id })
      .eq('id', sel.quote_line_id)
  }

  await supabase
    .from('quotes')
    .update({ status: 'APPROVED', approved_at: new Date() })
    .eq('id', quote_id)

  const { data: order } = await supabase
    .from('orders')
    .insert({ quote_id, status: 'OPEN' })
    .select()
    .single()

  const { data: lines } = await supabase
    .from('quote_lines')
    .select('quantity, selected_quote_item_id')
    .eq('quote_id', quote_id)

  for (const line of lines!) {
    await supabase.from('order_items').insert({
      order_id: order.id,
      quote_item_id: line.selected_quote_item_id,
      quantity: line.quantity
    })
  }

  await supabase.from('timeline_events').insert({
    type: 'APPROVED',
    reference_id: quote_id
  })

  return NextResponse.json({ ok: true })
}