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
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data: customer, error: cErr } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("customer_id", id)
      .single();
    if (cErr) throw cErr;

    const { data: quotes, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("quote_id, created_at, quote_no, vehicle_text")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (qErr) throw qErr;

    // attach sizes
    const quoteIds = (quotes ?? []).map(q => q.quote_id);
    let sizesMap: Record<string, string> = {};
    if (quoteIds.length) {
      const { data: lines, error: lErr } = await supabaseAdmin
        .from("quote_lines")
        .select("quote_id, size, quantity")
        .in("quote_id", quoteIds);
      if (lErr) throw lErr;

      const agg: Record<string, string[]> = {};
      for (const ln of lines ?? []) {
        const qid = ln.quote_id as string;
        if (!agg[qid]) agg[qid] = [];
        agg[qid].push(`${ln.size} x${ln.quantity}`);
      }
      for (const qid of Object.keys(agg)) sizesMap[qid] = agg[qid].join(", ");
    }

    const out = (quotes ?? []).map(q => ({
      ...q,
      quote_number: fmtQuoteNumber(q.created_at, Number(q.quote_no)),
      sizes: sizesMap[q.quote_id] ?? ""
    }));

    return NextResponse.json({ customer, quotes: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
