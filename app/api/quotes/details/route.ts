import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const quote_id = searchParams.get('quote_id')

    if (!quote_id) {
      return NextResponse.json(
        { error: 'quote_id required' },
        { status: 400 }
      )
    }

    // 1️⃣ QUOTE (cabecera)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        quote_id,
        quote_number,
        status,
        customer_name,
        customer_phone,
        customer_email
      `)
      .eq('quote_id', quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({
        quote: null,
        lines: []
      })
    }

    // 2️⃣ LINES (medidas)
    const { data: lines, error: linesError } = await supabase
      .from('quote_lines')
      .select(`
        line_id,
        size,
        quantity,
        selected_quote_item_id
      `)
      .eq('quote_id', quote_id)

    if (linesError || !lines || lines.length === 0) {
      return NextResponse.json({
        quote: {
          id: quote.quote_id,
          folio: quote.quote_number,
          status: quote.status,
          customer: {
            name: quote.customer_name,
            phone: quote.customer_phone,
            email: quote.customer_email
          }
        },
        lines: []
      })
    }

    const lineIds = lines.map(l => l.line_id)

    // 3️⃣ ITEMS (SOLO LOS QUE SE ENVIARON AL CLIENTE)
    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select(`
        quote_item_id,
        line_id,
        brand,
        model,
        price_each,
        stock,
        included
      `)
      .in('line_id', lineIds)
      .eq('included', true)

    const structuredLines = lines.map(line => ({
      id: line.line_id,
      measure: line.size,
      quantity: line.quantity,
      selected_quote_item_id: line.selected_quote_item_id,
      items: (items ?? []).filter(
        item => item.line_id === line.line_id
      )
    }))

    return NextResponse.json({
      quote: {
        id: quote.quote_id,
        folio: quote.quote_number,
        status: quote.status,
        customer: {
          name: quote.customer_name,
          phone: quote.customer_phone,
          email: quote.customer_email
        }
      },
      lines: structuredLines
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
