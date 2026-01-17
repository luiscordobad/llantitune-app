import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: header, error: hErr } = await supabase
      .from("orders_view_work")
      .select("*")
      .eq("order_id", id)
      .single();
    if (hErr) throw hErr;

    const { data: items, error: iErr } = await supabase
      .from("order_items_view_work")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true });
    if (iErr) throw iErr;

    return NextResponse.json({
      order_id: header.order_id,
      status: header.status,
      promised_at: header.promised_at,
      internal_notes: header.internal_notes,
      quote_number: fmtQuoteNumber(header.quote_created_at, Number(header.quote_no)),
      items: items ?? []
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
