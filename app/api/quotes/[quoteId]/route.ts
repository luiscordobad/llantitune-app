
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: any) {
  try {
    const rawId = String(ctx?.params?.quoteId || "").trim();
    if (!rawId) {
      return NextResponse.json({ error: "Missing quoteId" }, { status: 400 });
    }

    // 1) Try by UUID
    let quote = null;
    let quoteId = rawId;

    const byUuid = await supabaseAdmin
      .from("quotes")
      .select("*")
      .eq("quote_id", rawId)
      .maybeSingle();

    if (byUuid.data) {
      quote = byUuid.data;
      quoteId = byUuid.data.quote_id;
    }

    // 2) Fallback by quote_number / quote_no
    if (!quote) {
      const byNumber = await supabaseAdmin
        .from("quotes")
        .select("*")
        .or(`quote_number.eq.${rawId},quote_no.eq.${rawId}`)
        .maybeSingle();

      if (byNumber.data) {
        quote = byNumber.data;
        quoteId = byNumber.data.quote_id;
      }
    }

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found", id: rawId },
        { status: 404 }
      );
    }

    const { data: lines } = await supabaseAdmin
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quoteId)
      .order("line_no", { ascending: true });

    const { data: items } = await supabaseAdmin
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("rank", { ascending: true });

    return NextResponse.json({
      quote,
      lines: lines ?? [],
      items: items ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
