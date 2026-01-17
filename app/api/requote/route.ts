import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const quoteId = url.searchParams.get("quoteId");
    if (!quoteId) return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });

    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("customer_name, customer_phone, vehicle_text, customer_id")
      .eq("quote_id", quoteId)
      .single();
    if (qErr) throw qErr;

    let email: string | null = null;
    if (q.customer_id) {
      const { data: c, error: cErr } = await supabaseAdmin
        .from("customers")
        .select("email")
        .eq("customer_id", q.customer_id)
        .single();
      if (!cErr) email = c?.email ?? null;
    }

    const { data: lines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .select("size, quantity")
      .eq("quote_id", quoteId)
      .order("line_no", { ascending: true });
    if (lErr) throw lErr;

    return NextResponse.json({
      customerName: q.customer_name ?? "",
      customerPhone: q.customer_phone ?? "",
      customerEmail: email ?? "",
      vehicle: q.vehicle_text ?? "",
      lines: (lines ?? []).map(l => ({ size: l.size, qty: l.quantity }))
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
