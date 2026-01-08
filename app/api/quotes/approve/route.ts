import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { quote_id, line_id, quote_item_id } = await req.json()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('quote_lines')
    .update({ selected_quote_item_id: quote_item_id })
    .eq('line_id', line_id)

  await supabase
    .from('quotes')
    .update({ status: 'APPROVED', approved_at: new Date() })
    .eq('quote_id', quote_id)

  await supabase
    .from('orders')
    .insert({ quote_id, status: 'OPEN' })

  return NextResponse.json({ ok: true })
}