import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * NOTE:
 * We intentionally keep the 2nd argument untyped ("any") to avoid
 * Next.js route handler context type differences across versions.
 */
export async function GET(_req: Request, ctx: any) {
  try {
    const quoteId = String(ctx?.params?.quoteId ?? "");

    if (!quoteId) {
      return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });
    }

    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("*")
      .eq("quote_id", quoteId)
      .single();
    if (qErr) throw qErr;

    const { data: lines, error: lErr } = await supabaseAdmin
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quoteId)
      .order("line_no", { ascending: true });
    if (lErr) throw lErr;

    const { data: items, error: iErr } = await supabaseAdmin
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("rank", { ascending: true });
    if (iErr) throw iErr;

    return NextResponse.json({ quote, lines: lines ?? [], items: items ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
