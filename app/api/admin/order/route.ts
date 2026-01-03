import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function fmtQuoteNumber(createdAt: string, quoteNo: number) {
  const d = new Date(createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `LT-${y}${m}${dd}-${String(quoteNo).padStart(5, "0")}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const quoteId = url.searchParams.get("quoteId");
    if (!quoteId) return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });

    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("quote_id, created_at, quote_no")
      .eq("quote_id", quoteId)
      .single();
    if (qErr) throw qErr;

    const quoteNumber = fmtQuoteNumber(q.created_at, Number(q.quote_no));

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("order_id")
      .eq("quote_id", quoteId)
      .maybeSingle();
    if (oErr) throw oErr;

    if (!order?.order_id) return NextResponse.json({ quoteNumber, items: [] });

    const { data: items, error: iErr } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", order.order_id)
      .order("created_at", { ascending: true });
    if (iErr) throw iErr;

    return NextResponse.json({ quoteNumber, items: items ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
