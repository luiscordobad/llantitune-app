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
    const { customerName, customerEmail, customerPhone, lines, markup, minStock } = body

    const { data: quote } = await supabase
      .from('quotes')
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        status: 'DRAFT'
      })
      .select()
      .single()

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

      // 1️⃣ Catálogo
      const { data: tires } = await supabase
        .from('master_tires')
        .select('tire_id, brand, model, load_speed')
        .eq('size', ql.size)

      if (!tires?.length) {
        responseLines.push({ ...ql, options: [] })
        continue
      }

      const tireIds = tires.map(t => t.tire_id)

      // 2️⃣ Oferta MÁS RECIENTE
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .in('tire_id', tireIds)
        .eq('size', ql.size)
        .order('snapshot_date', { ascending: false })

      console.log('OFFERS RAW:', offers?.length)

      if (!offers?.length) {
        responseLines.push({ ...ql, options: [] })
        continue
      }

      // 3️⃣ Filtrar stock AQUÍ (no en SQL)
      const validOffers = offers.filter(o => Number(o.stock) >= Number(minStock))

      console.log('OFFERS AFTER STOCK:', validOffers.length)

      const itemsToInsert = validOffers.map(off => {
        const tire = tires.find(t => t.tire_id === off.tire_id)
        if (!tire) return null

        const qty = Math.min(Number(off.stock), ql.requested_qty)
        const priceEach = Math.round(Number(off.cost) * (1 + markup / 100))

        return {
          line_id: ql.line_id,
          brand: tire.brand,
          model: tire.model,
          tier_label: off.provider,
          stock: Number(off.stock),
          quoted_qty: qty,
          price_each: priceEach,
          total_tires: priceEach * qty,
          included: true
        }
      }).filter(Boolean)

      if (!itemsToInsert.length) {
        responseLines.push({ ...ql, options: [] })
        continue
      }

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
        options: items ?? []
      })
    }

    return NextResponse.json({
      quoteId: quote.quote_id,
      quoteNumber: 'BORRADOR',
      lines: responseLines
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
