import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { quoteId, status, note } = body ?? {};
    if (!quoteId || !status) return NextResponse.json({ error: "Missing quoteId/status" }, { status: 400 });

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    
if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

let assignedQuoteNumber: string | null = null;

// If moving to SENT and quote_number is null, assign one
if (String(status) === "SENT") {
  const { data: qrow, error: qerr } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (qerr) throw qerr;

  if (!qrow?.quote_number) {
    const { data: num, error: nerr } = await supabase.rpc("next_quote_number");
    if (nerr) throw nerr;

    assignedQuoteNumber = String(num);

    const { error: uerr } = await supabase
      .from("quotes")
      .update({ quote_number: assignedQuoteNumber, sent_at: new Date().toISOString() })
      .eq("quote_id", quoteId);
    if (uerr) throw uerr;
  } else {
    assignedQuoteNumber = qrow.quote_number;
  }
}


    const { data: before, error: bErr } = await supabase.from("quotes").select("status").eq("quote_id", quoteId).single();
    if (bErr) throw bErr;

    const patch: any = { status };
    const now = new Date().toISOString();
    if (status === "SENT") patch.sent_at = now;
    if (status === "APPROVED") patch.approved_at = now;
    if (status === "REJECTED") patch.rejected_at = now;

    const { error: uErr } = await supabase.from("quotes").update(patch).eq("quote_id", quoteId);
    if (uErr) throw uErr;

    if (status !== before?.status) {
      await supabase.from("timeline_events").insert([{
        entity_type: "QUOTE",
        entity_id: quoteId,
        event_type: "STATUS_CHANGE",
        from_status: String(before?.status ?? ""),
        to_status: String(status),
        note: note ?? null,
        created_by: user.id
      }]);
    }

    return NextResponse.json({ ok: true, quoteNumber: assignedQuoteNumber });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
