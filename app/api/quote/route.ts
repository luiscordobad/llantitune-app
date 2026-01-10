import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      customerName,
      customerEmail,
      customerPhone,
      lines,
      markup,
      minStock
    } = body

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        status: 'DRAFT'
      })
      .select()
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
    }

    const responseLines: any[] = []

    for (const line of lines) {
      const { data: ql } = await supabase
        .from('quote_lines')
        .insert({
          quote_id: quote.quote_id,
          size: line.size,
          requested_qty: line.qty,
          vehicle_make: line.vehicleMake,
          vehicle_model: line.vehicleModel,
          vehicle_year: line.vehicleYear
        })
        .select()
        .single()

      if (!ql) continue

      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('size', ql.size)
        .gte('stock', minStock)

      if (!inventory || inventory.length === 0) {
        responseLines.push({
          lineId: ql.line_id,
          size: ql.size,
          requestedQty: ql.requested_qty,
          vehicleMake: ql.vehicle_make,
          vehicleModel: ql.vehicle_model,
          vehicleYear: ql.vehicle_year,
          options: []
        })
        continue
      }

      const itemsToInsert = inventory.map(inv => {
        const priceEach = Math.round(inv.cost * (1 + markup / 100))
        const qty = Math.min(inv.stock, ql.requested_qty)

        return {
          line_id: ql.line_id,
          brand: inv.brand,
          model: inv.model,
          tier_label: inv.tier_label,
          stock: inv.stock,
          quoted_qty: qty,
          price_each: priceEach,
          total_tires: priceEach * qty,
          included: true
        }
      })

      const { data: items } = await supabase
        .from('quote_items')
        .insert(itemsToInsert)
        .select()

      responseLines.push({
        lineId: ql.line_id,
        size: ql.size,
        requestedQty: ql.requested_qty,
        vehicleMake: ql.vehicle_make,
        vehicleModel: ql.vehicle_model,
        vehicleYear: ql.vehicle_year,
        options: items?.map(i => ({
          quoteItemId: i.quote_item_id,
          brand: i.brand,
          model: i.model,
          tierLabel: i.tier_label,
          stock: i.stock,
          quotedQty: i.quoted_qty,
          priceEach: i.price_each,
          totalTires: i.total_tires,
          included: i.included
        })) ?? []
      })
    }

    return NextResponse.json({
      quoteId: quote.quote_id,
      quoteNumber: 'BORRADOR',
      lines: responseLines
    })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const quoteId = searchParams.get('quoteId')

  if (!quoteId) {
    return NextResponse.json({ error: 'quoteId required' }, { status: 400 })
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', quoteId)
    .single()

  return NextResponse.json(quote)
}
