import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        quote_id,
        status,
        quote_lines (
          line_id,
          selected_quote_item_id
        )
      `)
      .eq('quote_id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      quote_id: data.quote_id,
      lines: data.quote_lines
    })
  } catch (err: any) {
    console.error('Get quote error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
