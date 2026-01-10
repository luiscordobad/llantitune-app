import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { quote_id } = await req.json()

  if (!quote_id) {
    return NextResponse.json(
      { error: 'quote_id is required' },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1️⃣ Buscar cotización (USANDO quote_id CORRECTO)
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('quote_id, selected_quote_item_id, status')
    .eq('quote_id', quote_id)
    .single()

  if (error || !quote) {
    return NextResponse.json(
      { error: 'Quote not found' },
      { status: 404 }
    )
  }

  if (!quote.selected_quote_item_id) {
    return NextResponse.json(
      { error: 'No selected quote item' },
      { status: 400 }
    )
  }

  // 2️⃣ Aprobar cotización
  const { error: approveError } = await supabase
    .from('quotes')
    .update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
    })
    .eq('quote_id', quote_id)

  if (approveError) {
    return NextResponse.json(
      { error: 'Failed to approve quote' },
      { status: 500 }
    )
  }

  // 3️⃣ Crear orden
  await supabase.from('orders').insert({
    quote_id,
    status: 'OPEN',
  })

  return NextResponse.json({ ok: true })
}
