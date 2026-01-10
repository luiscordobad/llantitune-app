import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* =========================================================
   POST /api/quote
   Paso 4 – buscar llantas desde master_tires + offers
========================================================= */
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

    /* 1️⃣ Crear cotización */
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
      return NextResponse.json(
        { error: 'Failed to create quote' },
        { status: 500 }
      )
    }

    const responseLines: any[] = []

    for (const line of lines) {
      /* 2️⃣ Crear línea */
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

      /* 3️⃣ Buscar llantas base */
      const { data: tires } = await supabase
        .from('master_tires')
        .select('tire_id, brand, model, load_speed')
        .eq('size', ql.size)

      if (!tires || tires.length === 0) {
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

      const tireIds = tires.map(t => t.tire_id)

      /* 4️⃣ Buscar ofertas (AQUÍ está stock y precio) */
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .in('tire_id', tireIds)
        .eq('size', ql.size)
        .gte('stock', minStock)

      if (!offers || offers.length === 0) {
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

      /* 5️⃣ Armar items */
      const itemsToInsert = offers.map(off => {
        const tire = tires.find(t => t.tire_id === off.tire_id)
        if (!tire) return null

        const qty = Math.min(Number(off.stock), ql.requested_qty)
        const priceEach = Math.round(Number(off.cost) * (1 + markup / 100))

        return {
          line_id: ql.line_id,
          brand: tire.brand ?? off.brand,
          model: tire.model ?? off.model,
          tier_label: off.provider, // o lo que uses como gama
          stock: Number(off.stock),
          quoted_qty: qty,
          price_each: priceEach,
          total_tires: priceEach * qty,
          included: true
        }
      }).filter(Boolean)

      if (!itemsToInsert.length) {
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
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

/* =========================================================
   GET /api/quote
========================================================= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const quoteId = searchParams.get('quoteId')

  if (!quoteId) {
    return NextResponse.json(
      { error: 'quoteId is required' },
      { status: 400 }
    )
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('quote_id', quoteId)
    .single()

  return NextResponse.json(quote)
}
