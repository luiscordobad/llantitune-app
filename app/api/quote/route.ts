import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const quoteId = searchParams.get('quoteId')

  if (!quoteId) {
    return NextResponse.json(
      { error: 'quoteId is required' },
      { status: 400 }
    )
  }

  // 1️⃣ Obtener la cotización (SIN JOIN)
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', quoteId)
    .single()

  if (quoteError || !quote) {
    return NextResponse.json(
      { error: 'Quote not found' },
      { status: 404 }
    )
  }

  // 2️⃣ Obtener líneas
  const { data: lines } = await supabase
    .from('quote_lines')
    .select('*')
    .eq('quote_id', quoteId)

  // 3️⃣ Obtener items por línea
  const lineIds = lines?.map(l => l.line_id) ?? []

  const { data: items } = lineIds.length
    ? await supabase
        .from('quote_items')
        .select('*')
        .in('line_id', lineIds)
    : { data: [] }

  return NextResponse.json({
    ...quote,
    quote_lines: lines?.map(line => ({
      ...line,
      quote_items: items?.filter(i => i.line_id === line.line_id) ?? []
    })) ?? []
  })
}
