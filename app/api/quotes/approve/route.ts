import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { quote_id, line_id, quote_item_id } = await req.json()

    if (!quote_id || !line_id || !quote_item_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Set selected quote item for the line
    const { error: lineErr } = await supabase
      .from('quote_lines')
      .update({ selected_quote_item_id: quote_item_id })
      .eq('line_id', line_id)

    if (lineErr) throw lineErr

    // 2. Approve quote
    const { error: quoteErr } = await supabase
      .from('quotes')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString()
      })
      .eq('quote_id', quote_id)

    if (quoteErr) throw quoteErr

    // 3. Create order
    const { error: orderErr } = await supabase
      .from('orders')
      .insert({
        quote_id,
        status: 'OPEN'
      })

    if (orderErr) throw orderErr

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('Approve quote error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
