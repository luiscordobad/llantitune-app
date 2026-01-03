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

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get orders with quote header info
    const { data: orders, error } = await supabase
      .from("orders")
      .select("order_id, quote_id, status, created_at, updated_at, assigned_to, attended_by, promised_at, internal_notes, deposit_amount, quotes(quote_no, created_at, customer_name, vehicle_text)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const out = (orders ?? []).map((o: any) => ({
      ...o,
      quote_no: o.quotes?.quote_no,
      quote_created_at: o.quotes?.created_at,
      quote_number: fmtQuoteNumber(o.quotes?.created_at, Number(o.quotes?.quote_no)),
      customer_name: o.quotes?.customer_name,
      vehicle_text: o.quotes?.vehicle_text
    }));

    return NextResponse.json({ orders: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
