import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* =========================================================
   POST /api/quote
   Crea cotización + líneas + items usando INVENTARIO REAL
========================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      customerName,
      customerEmail,
      customerPhone,
      vehicles,
      lines,
      markup,
      install,
      extras,
      minStock,
      depositAmount,
      promisedAt,
      internalNotes
    } = body

    /* 1️⃣ Crear cotización */
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        deposit_amount: depositAmount,
        promised_at: promisedAt,
        internal_notes: internalNotes,
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

    /* 2️⃣ Crear líneas + buscar inventario */
    const createdLines: any[] = []

    for (const line of lines) {
      const { data: ql, error: lineError } = await supabase
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

      if (lineError || !ql) continue

      /* 3️⃣ Buscar inventario REAL */
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('size', ql.size)
        .gte('stock', minStock)
        .order('tier_label', { ascending: true })

      // Si no hay stock suficiente, regresamos línea vacía
      if (invError || !inventory || inventory.length === 0) {
        createdLines.push({
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

      /* 4️⃣ Calcular precios con markup */
      const optionsToInsert = inventory.map(inv => {
        const quotedQty = Math.min(inv.stock, ql.requested_qty)
        const priceEach = Math.round(inv.cost * (1 + markup / 100))

        return {
          line_id: ql.line_id,
          brand: inv.brand,
          model: inv.model,
          tier_label: inv.tier_label,
          stock: inv.stock,
          quoted_qty: quotedQty,
          price_each: priceEach,
          total_tires: priceEach * quotedQty,
          included: true
        }
      })

      /* 5️⃣ Insertar items */
      const { data: items } = await supabase
        .from('quote_items')
        .insert(optionsToInsert)
        .select()

      /* 6️⃣ Armar respuesta para frontend */
      createdLines.push({
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

    /* 7️⃣ Respuesta EXACTA que espera el frontend */
    return NextResponse.json({
      quoteId: quote.quote_id,
      quoteNumber: 'BORRADOR',
      lines: createdLines
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

/* =========================================================
   GET /api/quote?quoteId=...
   Consulta cotización existente
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

  const { data: lines } = await supabase
    .from('quote_lines')
    .select('*')
    .eq('quote_id', quoteId)

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
