import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const quoteId = body?.quoteId as string | undefined

    if (!quoteId) {
      return NextResponse.json({ ok: false, error: 'quoteId is required' }, { status: 400 })
    }

    const { data: lines, error: linesErr } = await supabaseAdmin
      .from('quote_lines')
      .select('line_id, selected_quote_item_id')
      .eq('quote_id', quoteId)

    if (linesErr) {
      return NextResponse.json({ ok: false, error: linesErr.message }, { status: 500 })
    }

    const missing = (lines ?? []).filter((l: any) => !l.selected_quote_item_id)
    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Select 1 option per line before creating a work order.',
          missingLineIds: missing.map((m: any) => m.line_id),
        },
        { status: 400 }
      )
    }

    // Ensure only selected items remain included for this quote
    const selectedIds = (lines ?? []).map((l: any) => l.selected_quote_item_id)
    await supabaseAdmin
      .from('quote_items')
      .update({ included: false })
      .eq('quote_id', quoteId)

    if (selectedIds.length > 0) {
      await supabaseAdmin
        .from('quote_items')
        .update({ included: true })
        .in('quote_item_id', selectedIds as any)
    }

    const { data: wo, error: woErr } = await supabaseAdmin
      .from('work_orders')
      .insert({ quote_id: quoteId, status: 'NEW' })
      .select('id')
      .single()

    if (woErr) {
      return NextResponse.json({ ok: false, error: woErr.message }, { status: 500 })
    }

    // Mark quote approved (optional, but helpful)
    await supabaseAdmin
      .from('quotes')
      .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
      .eq('quote_id', quoteId)

    return NextResponse.json({ ok: true, workOrderId: wo?.id ?? null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
