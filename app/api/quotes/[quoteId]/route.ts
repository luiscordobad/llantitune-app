import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/quotes/:quoteId
 * Returns quote header + lines + items for approval UI.
 */
export async function GET(_: Request, ctx: { params: { quoteId: string } }) {
  try {
    const quoteId = String(ctx?.params?.quoteId ?? "").trim();
    if (!quoteId) return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });

    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("quote_id, status, quote_no, created_at, customer_name, customer_phone, customer_email, vehicle_text, vehicle_make, vehicle_model, vehicle_year, notes, internal_notes, promised_at, deposit_amount")
      .eq("quote_id", quoteId)
      .single();
    if (qErr) throw qErr;

    const { data: lines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .select("line_id, line_no, size, quantity, selected_quote_item_id")
      .eq("quote_id", quoteId)
      .order("line_no", { ascending: true });
    if (lErr) throw lErr;

    const { data: items, error: iErr } = await supabaseAdmin
      .from("quote_items")
      .select("quote_item_id, quote_id, line_id, rank, provider, sku, tire_id, brand, model, load_speed, size, stock, cost, price_each, total_tires, total_with_services, included")
      .eq("quote_id", quoteId)
      .order("line_id", { ascending: true })
      .order("rank", { ascending: true });
    if (iErr) throw iErr;

    return NextResponse.json({ quote, lines: lines ?? [], items: items ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
