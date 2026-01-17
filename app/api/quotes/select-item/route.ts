
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { line_id, quote_item_id } = await req.json()

  if (!line_id || !quote_item_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('quote_lines')
    .update({ selected_quote_item_id: quote_item_id })
    .eq('line_id', line_id)

  return NextResponse.json({ ok: true })
}
