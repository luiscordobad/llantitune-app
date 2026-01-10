
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// ✅ This endpoint supports GET with ?quoteId=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('quoteId')

    if (!quoteId) {
      return NextResponse.json({ error: 'quoteId is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        quote_id,
        quote_lines (
          line_id,
          selected_quote_item_id
        )
      `)
      .eq('quote_id', quoteId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json({
      quote_id: data.quote_id,
      lines: data.quote_lines
    })
  } catch (err) {
    console.error('GET /api/quote error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
