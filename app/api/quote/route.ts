import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ GET /api/quote?quoteId=UUID
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const quoteId = searchParams.get('quoteId')

  if (!quoteId) {
    return NextResponse.json(
      { error: 'quoteId is required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_lines (
        *,
        quote_items (*)
      )
    `)
    .eq('quote_id', quoteId)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Quote not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(data)
}

// (tu POST existente se queda igual)
export async function POST(req: Request) {
  const body = await req.json()
  return NextResponse.json(body)
}
