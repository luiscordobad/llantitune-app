import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const quoteId = body?.quoteId as string | undefined
    const selections = (body?.selections as Array<{ lineId: string; quoteItemId: string }> | undefined) ?? []

    if (!quoteId) {
      return NextResponse.json({ ok: false, error: 'quoteId is required' }, { status: 400 })
    }
    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json({ ok: false, error: 'selections is required' }, { status: 400 })
    }

    // Validate lines belong to quote
    const { data: lines, error: linesErr } = await supabaseAdmin
      .from('quote_lines')
      .select('line_id')
      .eq('quote_id', quoteId)

    if (linesErr) throw linesErr
    const allowed = new Set((lines ?? []).map((l) => (l as any).line_id))

    for (const sel of selections) {
      if (!sel?.lineId || !sel?.quoteItemId) {
        return NextResponse.json({ ok: false, error: 'Each selection needs lineId and quoteItemId' }, { status: 400 })
      }
      if (!allowed.has(sel.lineId)) {
        return NextResponse.json(
          { ok: false, error: `lineId does not belong to quote: ${sel.lineId}` },
          { status: 400 }
        )
      }

      // 1) Set selected_quote_item_id on quote_lines
      const { error: upLineErr } = await supabaseAdmin
        .from('quote_lines')
        .update({ selected_quote_item_id: sel.quoteItemId })
        .eq('line_id', sel.lineId)

      if (upLineErr) throw upLineErr

      // 2) Ensure only selected item remains included for that line (within quote)
      const { data: lineItems, error: liErr } = await supabaseAdmin
        .from('quote_items')
        .select('quote_item_id')
        .eq('quote_id', quoteId)
        .eq('line_id', sel.lineId)

      if (liErr) throw liErr

      const ids = (lineItems ?? []).map((x) => (x as any).quote_item_id)
      if (!ids.includes(sel.quoteItemId)) {
        return NextResponse.json(
          { ok: false, error: `quoteItemId does not belong to quote line: ${sel.quoteItemId}` },
          { status: 400 }
        )
      }

      // set all false then set selected true
      const { error: allFalseErr } = await supabaseAdmin
        .from('quote_items')
        .update({ included: false })
        .eq('quote_id', quoteId)
        .eq('line_id', sel.lineId)

      if (allFalseErr) throw allFalseErr

      const { error: selTrueErr } = await supabaseAdmin
        .from('quote_items')
        .update({ included: true })
        .eq('quote_item_id', sel.quoteItemId)

      if (selTrueErr) throw selTrueErr
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('save-selection error', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
