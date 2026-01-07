import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const quote_id = searchParams.get('quote_id')

  if (!quote_id) {
    return NextResponse.json({ error: 'quote_id required' }, { status: 400 })
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      id, folio, status,
      client:clients(name, phone, email)
    `)
    .eq('id', quote_id)
    .single()

  const { data: lines } = await supabase
    .from('quote_lines')
    .select(`
      id, measure, quantity,
      items:quote_items(id, brand, model, price, stock)
    `)
    .eq('quote_id', quote_id)

  return NextResponse.json({ quote, lines })
}