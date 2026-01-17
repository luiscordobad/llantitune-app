import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * POST { quote_id }
 * Sets quotes.status = SENT and sent_at = now() if currently DRAFT.
 * Also writes a timeline event (best-effort).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const quoteId = body?.quote_id as string;

    if (!quoteId) return NextResponse.json({ error: "Missing quote_id" }, { status: 400 });

    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("quote_id, status")
      .eq("quote_id", quoteId)
      .single();
    if (qErr) throw qErr;
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    if (quote.status !== "DRAFT") {
      return NextResponse.json({ ok: true, status: quote.status });
    }

    const nowIso = new Date().toISOString();

    const { error: uErr } = await supabaseAdmin
      .from("quotes")
      .update({ status: "SENT", sent_at: nowIso })
      .eq("quote_id", quoteId);
    if (uErr) throw uErr;

    // Best-effort timeline
    await supabaseAdmin.from("timeline_events").insert({
      entity_type: "quote",
      entity_id: quoteId,
      event_type: "STATUS_CHANGE",
      from_status: "DRAFT",
      to_status: "SENT",
      note: "Marked as sent from CRM.",
      created_by: null,
      created_at: nowIso,
    });

    return NextResponse.json({ ok: true, status: "SENT" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
