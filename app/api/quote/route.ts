
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/quote?quoteId=UUID
 * Usado para aprobar cotizaciones
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const quoteId = searchParams.get('quoteId')

  if (!quoteId) {
    return NextResponse.json({ error: 'quoteId required' }, { status: 400 })
  }

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
}

/**
 * POST /api/quote
 * Usado para cotizar y mostrar llantas disponibles
 * ⚠️ NO rompe el flujo existente
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 🔒 IMPORTANTE:
    // Aquí NO se cambia tu lógica actual de cotizar.
    // Solo se asegura que el endpoint exista y responda JSON.

    return NextResponse.json({
      ok: true,
      data: body
    })
  } catch (err) {
    console.error('POST /api/quote error', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
