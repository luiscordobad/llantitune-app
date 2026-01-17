import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { quote_id } = await req.json()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('quotes')
    .update({ status: 'CANCELLED' })
    .eq('quote_id', quote_id)

  return NextResponse.json({ ok: true })
}